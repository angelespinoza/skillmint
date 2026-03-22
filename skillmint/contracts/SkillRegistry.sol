// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title SkillRegistry
 * @notice On-chain index for every SkillMint skill.
 *
 * Two IPFS documents per skill:
 *   skillIpfsHash   → skill_definition.json (system_prompt, knowledge, schema)
 *   profileIpfsHash → creator_profile.json  (name, bio, credentials)
 *                     empty string "" when creator publishes anonymously
 *
 * Anonymous mode:
 *   - isAnonymous = true  → profileIpfsHash stored as ""
 *   - owner wallet ALWAYS stored on-chain (required for payment routing)
 *   - public getSkill() returns address(0) and "" for identity fields
 *   - getSkillOwner() only callable by whitelisted protocol contracts
 */
contract SkillRegistry is Ownable, ReentrancyGuard {

    // ─── Structs ──────────────────────────────────────────────────────────────

    struct Skill {
        uint256 id;
        address owner;
        string  skillIpfsHash;
        string  profileIpfsHash;
        string  name;
        string  category;
        uint256 pricePerCall;   // wei — x402 / pay-per-call
        uint256 licensePrice;   // wei — ERC-721 NFT license (0 = disabled)
        bool    isAnonymous;
        bool    active;
        uint256 createdAt;
        uint256 totalCalls;
    }

    // Identity-safe public view
    struct SkillView {
        uint256 id;
        address owner;           // address(0) when anonymous
        string  skillIpfsHash;
        string  profileIpfsHash; // "" when anonymous
        string  name;
        string  category;
        uint256 pricePerCall;
        uint256 licensePrice;
        bool    isAnonymous;
        bool    active;
        uint256 createdAt;
        uint256 totalCalls;
    }

    // ─── State ────────────────────────────────────────────────────────────────

    uint256 private _nextId = 1;
    mapping(uint256 => Skill)     private _skills;
    mapping(address => uint256[]) private _ownerSkills;

    address public paymentContract;
    address public licenseContract;

    // ─── Events ───────────────────────────────────────────────────────────────

    event SkillRegistered(
        uint256 indexed skillId,
        address indexed owner,
        string  name,
        string  category,
        uint256 pricePerCall,
        uint256 licensePrice,
        bool    isAnonymous
    );
    event SkillUpdated(uint256 indexed skillId, uint256 pricePerCall, uint256 licensePrice, bool active);
    event ProfileUpdated(uint256 indexed skillId, string newProfileIpfsHash);
    event CallCountIncremented(uint256 indexed skillId, uint256 newTotal);

    // ─── Constructor ──────────────────────────────────────────────────────────

    constructor() {}

    // ─── Write: creators ──────────────────────────────────────────────────────

    /**
     * @param skillIpfsHash    IPFS CID of skill_definition.json
     * @param profileIpfsHash  IPFS CID of creator_profile.json ("" if anonymous)
     * @param name             Display name shown in marketplace
     * @param category         Lowercase tag: "legal", "accounting", "medical"...
     * @param pricePerCall     Cost in wei for one x402 call
     * @param licensePrice     Cost in wei to mint NFT license (0 = NFT disabled)
     * @param isAnonymous      true → hides creator identity from public views
     */
    function registerSkill(
        string  calldata skillIpfsHash,
        string  calldata profileIpfsHash,
        string  calldata name,
        string  calldata category,
        uint256          pricePerCall,
        uint256          licensePrice,
        bool             isAnonymous
    ) external returns (uint256 skillId) {
        require(bytes(skillIpfsHash).length > 0, "skillIpfsHash required");
        require(bytes(name).length > 0,          "name required");
        require(bytes(category).length > 0,      "category required");
        require(pricePerCall > 0,                "pricePerCall must be > 0");

        skillId = _nextId++;

        _skills[skillId] = Skill({
            id:               skillId,
            owner:            msg.sender,
            skillIpfsHash:    skillIpfsHash,
            profileIpfsHash:  isAnonymous ? "" : profileIpfsHash,
            name:             name,
            category:         category,
            pricePerCall:     pricePerCall,
            licensePrice:     licensePrice,
            isAnonymous:      isAnonymous,
            active:           true,
            createdAt:        block.timestamp,
            totalCalls:       0
        });

        _ownerSkills[msg.sender].push(skillId);

        emit SkillRegistered(skillId, msg.sender, name, category, pricePerCall, licensePrice, isAnonymous);
    }

    /**
     * @notice Update prices, active flag, and/or anonymous setting.
     *         Switching to anonymous automatically wipes profileIpfsHash.
     */
    function updateSkill(
        uint256 skillId,
        uint256 newPricePerCall,
        uint256 newLicensePrice,
        bool    active,
        bool    isAnonymous
    ) external {
        Skill storage s = _skills[skillId];
        require(s.id != 0,             "skill not found");
        require(s.owner == msg.sender, "not owner");
        require(newPricePerCall > 0,   "pricePerCall must be > 0");

        s.pricePerCall = newPricePerCall;
        s.licensePrice = newLicensePrice;
        s.active       = active;
        s.isAnonymous  = isAnonymous;
        if (isAnonymous) s.profileIpfsHash = "";

        emit SkillUpdated(skillId, newPricePerCall, newLicensePrice, active);
    }

    /**
     * @notice Update creator profile IPFS hash.
     *         Reverts if skill is anonymous.
     */
    function updateProfile(uint256 skillId, string calldata newProfileIpfsHash) external {
        Skill storage s = _skills[skillId];
        require(s.id != 0,             "skill not found");
        require(s.owner == msg.sender, "not owner");
        require(!s.isAnonymous,        "skill is anonymous - no profile");
        s.profileIpfsHash = newProfileIpfsHash;
        emit ProfileUpdated(skillId, newProfileIpfsHash);
    }

    // ─── Write: protocol ──────────────────────────────────────────────────────

    function setPaymentContract(address _payment) external onlyOwner {
        paymentContract = _payment;
    }

    function setLicenseContract(address _license) external onlyOwner {
        licenseContract = _license;
    }

    function incrementCallCount(uint256 skillId) external {
        require(
            msg.sender == paymentContract || msg.sender == licenseContract,
            "unauthorized"
        );
        _skills[skillId].totalCalls += 1;
        emit CallCountIncremented(skillId, _skills[skillId].totalCalls);
    }

    // ─── Read: public (identity-safe) ─────────────────────────────────────────

    /**
     * @notice Public getter. Strips wallet and profile when anonymous.
     *         Agents only need skillIpfsHash + prices — those are always returned.
     */
    function getSkill(uint256 skillId) external view returns (SkillView memory) {
        Skill storage s = _skills[skillId];
        require(s.id != 0, "skill not found");
        return SkillView({
            id:              s.id,
            owner:           s.isAnonymous ? address(0) : s.owner,
            skillIpfsHash:   s.skillIpfsHash,
            profileIpfsHash: s.isAnonymous ? "" : s.profileIpfsHash,
            name:            s.name,
            category:        s.category,
            pricePerCall:    s.pricePerCall,
            licensePrice:    s.licensePrice,
            isAnonymous:     s.isAnonymous,
            active:          s.active,
            createdAt:       s.createdAt,
            totalCalls:      s.totalCalls
        });
    }

    /**
     * @notice Returns real owner — only callable by whitelisted protocol contracts.
     *         Used by SkillPayment and SkillLicense to route funds correctly.
     */
    function getSkillOwner(uint256 skillId) external view returns (address) {
        require(
            msg.sender == paymentContract || msg.sender == licenseContract,
            "unauthorized"
        );
        Skill storage s = _skills[skillId];
        require(s.id != 0, "skill not found");
        return s.owner;
    }

    function getSkillsByOwner(address owner) external view returns (uint256[] memory) {
        return _ownerSkills[owner];
    }

    function getPrices(uint256 skillId) external view returns (uint256, uint256) {
        Skill storage s = _skills[skillId];
        require(s.id != 0, "skill not found");
        return (s.pricePerCall, s.licensePrice);
    }

    function isActive(uint256 skillId) external view returns (bool) {
        return _skills[skillId].active;
    }

    function totalSkills() external view returns (uint256) {
        return _nextId - 1;
    }
}
