// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./SkillRegistry.sol";

/**
 * @title SkillLicense
 * @notice ERC-721 NFT that grants unlimited access to a SkillMint skill.
 *
 * One NFT = one license for one specific skill.
 * The NFT is transferable and resellable on any ERC-721 marketplace.
 *
 * Access check:
 *   hasLicense(skillId, agentWallet) → true if wallet holds at least one
 *   token for that skillId.
 *
 * Payment split on mint: 90% creator · 10% treasury
 * (Same split as pay-per-call — consistent UX for creators)
 */
contract SkillLicense is ERC721, Ownable, ReentrancyGuard {

    // ─── State ────────────────────────────────────────────────────────────────

    SkillRegistry public registry;
    address       public treasury;
    uint256       public platformFeeBps = 1000; // 10%

    uint256 private _nextTokenId = 1;

    // tokenId → skillId
    mapping(uint256 => uint256) public tokenSkill;

    // skillId → holder → count (allows multiple licenses per wallet)
    mapping(uint256 => mapping(address => uint256)) private _licenseCount;

    // ─── Events ───────────────────────────────────────────────────────────────

    event LicenseMinted(
        uint256 indexed tokenId,
        uint256 indexed skillId,
        address indexed buyer,
        uint256 totalPaid,
        uint256 creatorShare,
        uint256 platformShare
    );

// ─── Constructor ──────────────────────────────────────────────────────────

constructor(address _registry, address _treasury)
    ERC721("SkillMint License", "SKML")
{
    registry = SkillRegistry(_registry);
    treasury = _treasury;
}

    // ─── Core ─────────────────────────────────────────────────────────────────

    /**
     * @notice Mint a license NFT for a skill.
     *         msg.value must equal skill.licensePrice exactly.
     *         licensePrice == 0 means NFT licensing is disabled for that skill.
     */
    function mintLicense(uint256 skillId) external payable nonReentrant returns (uint256 tokenId) {
        (, uint256 licensePrice) = registry.getPrices(skillId);

        require(registry.isActive(skillId), "skill is inactive");
        require(licensePrice > 0,           "NFT license not enabled for this skill");
        require(msg.value == licensePrice,  "incorrect payment");

        // Split payment
        uint256 platformShare = (msg.value * platformFeeBps) / 10_000;
        uint256 creatorShare  = msg.value - platformShare;

        // Route funds
        address creator = registry.getSkillOwner(skillId);
        (bool okCreator,)  = payable(creator).call{value: creatorShare}("");
        (bool okTreasury,) = payable(treasury).call{value: platformShare}("");
        require(okCreator && okTreasury, "transfer failed");

        // Mint NFT
        tokenId = _nextTokenId++;
        _safeMint(msg.sender, tokenId);
        tokenSkill[tokenId] = skillId;
        _licenseCount[skillId][msg.sender] += 1;

        // Update call count in registry
        registry.incrementCallCount(skillId);

        emit LicenseMinted(tokenId, skillId, msg.sender, msg.value, creatorShare, platformShare);
    }

    // ─── Access check ─────────────────────────────────────────────────────────

    /**
     * @notice Returns true if `holder` owns at least one license for `skillId`.
     *         Called by the SkillMint backend before executing a licensed call.
     */
    function hasLicense(uint256 skillId, address holder) external view returns (bool) {
        return _licenseCount[skillId][holder] > 0;
    }

    function licenseCount(uint256 skillId, address holder) external view returns (uint256) {
        return _licenseCount[skillId][holder];
    }

    // ─── Override: track transfers ────────────────────────────────────────────

    /**
     * @dev Keep _licenseCount in sync when NFT is transferred or burned.
     */
function _beforeTokenTransfer(address from, address to, uint256 tokenId, uint256)
    internal override
{
    uint256 skillId = tokenSkill[tokenId];
    if (from != address(0)) {
        if (_licenseCount[skillId][from] > 0)
            _licenseCount[skillId][from] -= 1;
    }
    if (to != address(0)) {
        _licenseCount[skillId][to] += 1;
    }
}

    // ─── Token URI ────────────────────────────────────────────────────────────

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_exists(tokenId), "token does not exist");
        // In production: return IPFS URI with skill metadata for NFT marketplaces
        return string(abi.encodePacked(
            "https://skillmint.xyz/api/license/",
            _toString(tokenId)
        ));
    }

    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) return "0";
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) { digits++; temp /= 10; }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits--;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }

    // ─── Admin ────────────────────────────────────────────────────────────────

    function setTreasury(address _treasury) external onlyOwner {
        treasury = _treasury;
    }

    function setPlatformFee(uint256 bps) external onlyOwner {
        require(bps <= 2000, "max 20%");
        platformFeeBps = bps;
    }
}
