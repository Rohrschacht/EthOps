// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.7.0 <0.9.0;

/** 
 * @title DevOpsRegistry
 * @dev Implements voting process
 */
contract DevOpsRegistry {
    event NominateVoter(address nominee);
    event ReleaseVoter(address releasee);
    event VersionProposalCreated(bytes20 proposal);
    event DeploymentProposalCreated(address proposal);
    event VersionQuorumProposalCreated(uint newVersionQuorum);
    event RoleBindingQuorumProposalCreated(uint newRoleBindingQuorum);
    event RoleBindingVoteCast(address voter, address subject, bool accepted);
    event VersionVoteCast(address voter, bytes20 proposal, bool accepted);
    event DeploymentVoteCast(address voter, address proposal, bool accepted);
    event QuorumVoteCast(address voter, bool accepted);
    event RoleBindingAccepted(address subject);
    event RoleBindingRejected(address subject);
    event VersionAccepted(bytes20 subject);
    event VersionRejected(bytes20 subject);
    event DeploymentAccepted(address subject);
    event DeploymentRejected(address subject);
    event QuorumAccepted();
    event QuorumRejected();

    enum ProposalState {
        INACTIVE,
        ACTIVE,
        ACCEPTED,
        REJECTED
    }

    struct VersionProposal {
        ProposalState state;
        address[] voters;
        uint numberOfPositiveVoters;
        uint numberOfNegativeVoters;
    }

    struct DeploymentProposal {
        ProposalState state;
        address[] voters;
        uint numberOfPositiveVoters;
        uint numberOfNegativeVoters;
    }

    enum RoleBindingState {
        INACTIVE,
        NOMINATION,
        RELEASE,
        ACCEPTED,
        REJECTED
    }

    struct RoleBindingProposal {
        RoleBindingState state;
        address[] voters;
        uint numberOfPositiveVoters;
        uint numberOfNegativeVoters;
    }

    enum QuorumState {
        INACTIVE,
        VERSION,
        ROLEBINDING,
        ACCEPTED,
        REJECTED
    }

    struct QuorumProposal {
        QuorumState state;
        uint newQuorum;
        address[] voters;
        uint numberOfPositiveVoters;
        uint numberOfNegativeVoters;
    }

    address public mainPipeline;

    mapping(address => bool) public voters;
    uint numberOfVoters;

    mapping(bytes20 => VersionProposal) versionProposals;
    mapping(address => DeploymentProposal) deploymentProposals;
    mapping(address => RoleBindingProposal) roleBindingProposals;
    QuorumProposal quorumProposal;

    uint versionQuorum;
    uint roleBindingQuorum;

    address public applicationContract;

    /** 
     * @dev Create a new DevOpsRegistry with some initial voters and an initial quorum
     * @param initialVoters addresses of the initially allowed voters
     * @param initialVersionQuorum initial required quorum for the version and deployment voting processes
     * @param initialRoleBindingQuorum initial required quorum for the role binding voting processes
     */
    constructor(address[] memory initialVoters, uint initialVersionQuorum, uint initialRoleBindingQuorum) {
        mainPipeline = msg.sender;
        if (initialVersionQuorum > 100) {
            revert("Initial quorum should be between 0 and 100");
        }
        if (initialRoleBindingQuorum > 100) {
            revert("Initial quorum should be between 0 and 100");
        }
        versionQuorum = initialVersionQuorum;
        roleBindingQuorum = initialRoleBindingQuorum;
        numberOfVoters = initialVoters.length;

        for (uint i = 0; i < initialVoters.length; i++) {
            voters[initialVoters[i]] = true;
        }

        quorumProposal.state = QuorumState.INACTIVE;
        quorumProposal.numberOfPositiveVoters = 0;
        quorumProposal.numberOfNegativeVoters = 0;
    }

    // modifier to check if caller is the main pipeline
    modifier isMainPipeline() {
        require(msg.sender == mainPipeline, "Caller is not registered as the main pipeline");
        _;
    }

    // modifier to check if caller is a voter
    modifier isVoter() {
        require(voters[msg.sender], "Caller is not amongst the voters");
        _;
    }

    // modifier to check if a VersionProposal with this name exists
    modifier vpExists(bytes20 name) {
        VersionProposal storage versionProposal = versionProposals[name];
        require(versionProposal.state != ProposalState.INACTIVE, "This VersionProposal has not been initialized");
        _;
    }

    // modifier to check if a VersionProposal with this name is not currently active
    modifier vpUnique(bytes20 name) {
        VersionProposal storage versionProposal = versionProposals[name];
        require(versionProposal.state != ProposalState.ACTIVE, "VersionProposal already exists");
        _;
    }

    // modifier to check that the caller has not voted on this VersionProposal yet
    modifier vpHasNotVoted(bytes20 name) {
        VersionProposal storage versionProposal = versionProposals[name];
        for (uint i = 0; i < versionProposal.voters.length; i++) {
            require(versionProposal.voters[i] != msg.sender, "You have already voted on this VersionProposal");
        }
        _;
    }

    // modifier to check that a RoleBindingProposal for this candidate exists
    modifier rbpExists(address candidate) {
        RoleBindingProposal storage roleBindingProposal = roleBindingProposals[candidate];
        require(roleBindingProposal.state != RoleBindingState.INACTIVE, "This RoleBindingProposal does not exist");
        _;
    }

    // modifier to check that a RoleBindingProposal for this candidate is not currently active
    modifier rbpUnique(address candidate) {
        require(roleBindingProposals[candidate].state == RoleBindingState.INACTIVE, "RoleBindingProposal with that address already exists");
        _;
    }

    // modifier to check that the caller has not voted on this RoleBindingProposal yet
    modifier rbpNotVoted(address candidate) {
        RoleBindingProposal storage proposal = roleBindingProposals[candidate];
        for (uint i = 0; i < proposal.voters.length; i++) {
            require(proposal.voters[i] != msg.sender, "You have already voted on this RoleBindingProposal");
        }
        _;
    }

    // modifier to check that a DeploymentProposal for this address exists
    modifier dpExists(address newDeployment) {
        DeploymentProposal storage deploymentProposal = deploymentProposals[newDeployment];
        require(deploymentProposal.state != ProposalState.INACTIVE, "This DeploymentProposal has not been initialized");
        _;
    }

    // modifier to check that a DeploymentProposal for this address is not currently active
    modifier dpUnique(address newDeployment) {
        DeploymentProposal storage deploymentProposal = deploymentProposals[newDeployment];
        require(deploymentProposal.state != ProposalState.ACTIVE, "DeploymentProposal already exists");
        _;
    }

    // modifier to check that the caller has not voted on this DeploymentProposal yet
    modifier dpNotVoted(address newDeployment) {
        DeploymentProposal storage proposal = deploymentProposals[newDeployment];
        for (uint i = 0; i < proposal.voters.length; i++) {
            require(proposal.voters[i] != msg.sender, "You have already voted on this DeploymentProposal");
        }
        _;
    }

    // modifier to check that a quorum proposal exists
    modifier qpExists() {
        require(quorumProposal.state != QuorumState.INACTIVE, "The quorum proposal is inactive");
        _;
    }

    // modifier to check that a quorum proposal is currently active
    modifier qpActive() {
        require(quorumProposal.state == QuorumState.VERSION || quorumProposal.state == QuorumState.ROLEBINDING, "The quorum proposal is inactive");
        _;
    }

    // modifier to check that a quorum proposal is not currently active
    modifier qpUnique() {
        require(!(quorumProposal.state == QuorumState.VERSION || quorumProposal.state == QuorumState.ROLEBINDING), "The quorum proposal is already active");
        _;
    }

    // modifier to check that the caller has not voted on this quorum proposal yet
    modifier qpNotVoted() {
        for (uint i = 0; i < quorumProposal.voters.length; i++) {
            require(quorumProposal.voters[i] != msg.sender, "You have already voted on this quorum proposal");
        }
        _;
    }

    // modifier to check that the quorum is between 0 and 100
    modifier quorumValid(uint quorum) {
        require(quorum <= 100, "quorum should be between 0 and 100");
        _;
    }

    /**
     * @dev Give 'candidate' the right to vote. May only be called by voters.
     * @param candidate address of new voting candidate
     */
    function nominateVoter(address candidate) public isVoter rbpUnique(candidate) {
        RoleBindingProposal storage roleBindingProposal = roleBindingProposals[candidate];
        roleBindingProposal.state = RoleBindingState.NOMINATION;
        roleBindingProposal.numberOfPositiveVoters = 0;
        roleBindingProposal.numberOfNegativeVoters = 0;
        delete roleBindingProposal.voters;
        emit NominateVoter(candidate);
    }

    /** 
     * @dev Remove candidate's right to vote. May only be called by voters.
     * @param candidate address of to-be-removed voter
     */
    function releaseVoter(address candidate) public isVoter rbpUnique(candidate) {
        RoleBindingProposal storage roleBindingProposal = roleBindingProposals[candidate];
        roleBindingProposal.state = RoleBindingState.RELEASE;
        roleBindingProposal.numberOfPositiveVoters = 0;
        roleBindingProposal.numberOfNegativeVoters = 0;
        delete roleBindingProposal.voters;
        emit ReleaseVoter(candidate);
    }

    /**
     * @dev Create a VersionProposal. May only be called by the main pipeline.
     * @param name name of the VersionProposal (Git commit hash)
     */
    function createVersionProposal(bytes20 name) public isMainPipeline vpUnique(name) {
        VersionProposal storage versionProposal = versionProposals[name];
        versionProposal.state = ProposalState.ACTIVE;
        versionProposal.numberOfPositiveVoters = 0;
        versionProposal.numberOfNegativeVoters = 0;
        delete versionProposal.voters;
        emit VersionProposalCreated(name);
    }

    /**
     * @dev Create a DeploymentProposal. May only be called by the main pipeline.
     * @param newDeployment address of the new deployment (replaces applicationContract when accepted)
     */
    function createDeploymentProposal(address newDeployment) public isMainPipeline dpUnique(newDeployment) {
        DeploymentProposal storage deploymentProposal = deploymentProposals[newDeployment];
        deploymentProposal.state = ProposalState.ACTIVE;
        deploymentProposal.numberOfPositiveVoters = 0;
        deploymentProposal.numberOfNegativeVoters = 0;
        delete deploymentProposal.voters;
        emit DeploymentProposalCreated(newDeployment);
    }

    /**
     * @dev Create a version quorum proposal. May only be called by voters.
     * @param quorum new quorum for version proposals
     */
    function createVersionQuorumProposal(uint quorum) public isVoter quorumValid(quorum) qpUnique {
        quorumProposal.state = QuorumState.VERSION;
        quorumProposal.newQuorum = quorum;
        quorumProposal.numberOfPositiveVoters = 0;
        quorumProposal.numberOfNegativeVoters = 0;
        delete quorumProposal.voters;
        emit VersionQuorumProposalCreated(quorum);
    }

    /**
     * @dev Create a role binding quorum proposal. May only be called by voters.
     * @param quorum new quorum for role binding proposals
     */
    function createRoleBindingQuorumProposal(uint quorum) public isVoter quorumValid(quorum) qpUnique {
        quorumProposal.state = QuorumState.ROLEBINDING;
        quorumProposal.newQuorum = quorum;
        quorumProposal.numberOfPositiveVoters = 0;
        quorumProposal.numberOfNegativeVoters = 0;
        delete quorumProposal.voters;
        emit RoleBindingQuorumProposalCreated(quorum);
    }

    /**
     * @dev Give your vote to a VersionProposal with the given name
     * @param name git commit hash to vote for
     * @param accept indicates that you accept the proposal
     */
    function voteVersionProposal(bytes20 name, bool accept) public isVoter vpExists(name) vpHasNotVoted(name) {
        VersionProposal storage versionProposal = versionProposals[name];
        versionProposal.voters.push(msg.sender);
        if (accept) {
            versionProposal.numberOfPositiveVoters++;
        } else {
            versionProposal.numberOfNegativeVoters++;
        }
        emit VersionVoteCast(msg.sender, name, accept);

        if (versionProposalAccepted(name)) {
            versionProposal.state = ProposalState.ACCEPTED;
            emit VersionAccepted(name);
        } else if (versionProposalRejected(name)) {
            versionProposal.state = ProposalState.REJECTED;
            emit VersionRejected(name);
        }
    }

    /**
     * @dev Public view into the state of a VersionProposal: was it accepted?
     * @param name git commit hash to check
     */
    function versionProposalAccepted(bytes20 name) public view vpExists(name) returns (bool) {
        VersionProposal storage versionProposal = versionProposals[name];
        if (versionProposal.state == ProposalState.ACCEPTED) {
            return true;
        }
        uint acceptanceRatio = (versionProposal.numberOfPositiveVoters * 100) / numberOfVoters;
        return acceptanceRatio >= versionQuorum;
    }

    /**
     * @dev Public view into the state of a VersionProposal: was it rejected?
     * @param name git commit hash to check
     */
    function versionProposalRejected(bytes20 name) public view vpExists(name) returns (bool) {
        VersionProposal storage versionProposal = versionProposals[name];
        if (versionProposal.state == ProposalState.REJECTED) {
            return true;
        }
        uint rejectionRatio = (versionProposal.numberOfNegativeVoters * 100) / numberOfVoters;
        return rejectionRatio > (100 - versionQuorum);
    }

    /**
     * @dev Trigger the acceptance/rejection of a VersionProposal after another operation may have changed the state of the proposal outside of the voting process.
     * @param name git commit hash to check
     */
    function triggerVersionProposalCheck(bytes20 name) public isVoter vpExists(name) {
        VersionProposal storage versionProposal = versionProposals[name];
        if (versionProposal.state == ProposalState.ACTIVE) {
            if (versionProposalAccepted(name) && !versionProposalRejected(name)) {
                versionProposals[name].state = ProposalState.ACCEPTED;
                emit VersionAccepted(name);
            } else {
                versionProposals[name].state = ProposalState.REJECTED;
                emit VersionRejected(name);
            }
        }
    }

    /**
     * @dev Give your vote to a RoleBindingProposal for the given candidate
     * @param candidate address of the candidate to vote for
     * @param accept indicates that you accept the proposal
     */
    function voteRoleBindingProposal(address candidate, bool accept) public isVoter rbpExists(candidate) rbpNotVoted(candidate) {
        RoleBindingProposal storage roleBindingProposal = roleBindingProposals[candidate];
        roleBindingProposal.voters.push(msg.sender);
        if (accept) {
            roleBindingProposal.numberOfPositiveVoters++;
        } else {
            roleBindingProposal.numberOfNegativeVoters++;
        }
        emit RoleBindingVoteCast(msg.sender, candidate, accept);

        if (roleBindingProposalAccepted(candidate)) {
            if (roleBindingProposal.state == RoleBindingState.NOMINATION) {
                voters[candidate] = true;
                numberOfVoters++;
            }
            if (roleBindingProposal.state == RoleBindingState.RELEASE) {
                voters[candidate] = false;
                numberOfVoters--;
            }
            roleBindingProposal.state = RoleBindingState.ACCEPTED;
            emit RoleBindingAccepted(candidate);
        } else if (roleBindingProposalRejected(candidate)) {
            roleBindingProposal.state = RoleBindingState.REJECTED;
            emit RoleBindingRejected(candidate);
        }
    }

    /**
     * @dev Public view into the state of a RoleBindingProposal: was it accepted?
     * @param candidate address of the candidate to check
     */
    function roleBindingProposalAccepted(address candidate) public view rbpExists(candidate) returns (bool) {
        RoleBindingProposal memory roleBindingProposal = roleBindingProposals[candidate];
        if (roleBindingProposal.state == RoleBindingState.ACCEPTED) {
            return true;
        }
        uint acceptanceRatio = (roleBindingProposal.numberOfPositiveVoters * 100) / numberOfVoters;
        return acceptanceRatio >= roleBindingQuorum;
    }

    /**
     * @dev Public view into the state of a RoleBindingProposal: was it rejected?
     * @param candidate address of the candidate to check
     */
    function roleBindingProposalRejected(address candidate) public view rbpExists(candidate) returns (bool) {
        RoleBindingProposal memory roleBindingProposal = roleBindingProposals[candidate];
        if (roleBindingProposal.state == RoleBindingState.REJECTED) {
            return true;
        }
        uint acceptanceRatio = (roleBindingProposal.numberOfPositiveVoters * 100) / numberOfVoters;
        return acceptanceRatio < roleBindingQuorum && roleBindingProposal.voters.length == numberOfVoters;
    }

    /**
     * @dev Give your vote to the currently active QuorumProposal
     * @param accept indicates that you accept the proposal
     */
    function voteQuorumProposal(bool accept) public isVoter qpActive qpNotVoted {
        quorumProposal.voters.push(msg.sender);
        if (accept) {
            quorumProposal.numberOfPositiveVoters++;
        } else {
            quorumProposal.numberOfNegativeVoters++;
        }
        emit QuorumVoteCast(msg.sender, accept);

        if (quorumProposalAccepted()) {
            if (quorumProposal.state == QuorumState.VERSION) {
                versionQuorum = quorumProposal.newQuorum;
            }
            if (quorumProposal.state == QuorumState.ROLEBINDING) {
                roleBindingQuorum = quorumProposal.newQuorum;
            }
            quorumProposal.state = QuorumState.ACCEPTED;
            emit QuorumAccepted();
        } else if (quorumProposalRejected()) {
            quorumProposal.state = QuorumState.REJECTED;
            emit QuorumRejected();
        }
    }

    /**
     * @dev Public view into the state of the currently active QuorumProposal: was it accepted?
     */
    function quorumProposalAccepted() public view qpExists returns (bool) {
        if (quorumProposal.state == QuorumState.ACCEPTED) {
            return true;
        }
        uint acceptanceRatio = (quorumProposal.numberOfPositiveVoters * 100) / numberOfVoters;
        return acceptanceRatio >= roleBindingQuorum;
    }

    /**
     * @dev Public view into the state of the currently active QuorumProposal: was it rejected?
     */
    function quorumProposalRejected() public view qpExists returns (bool) {
        if (quorumProposal.state == QuorumState.REJECTED) {
            return true;
        }
        uint acceptanceRatio = (quorumProposal.numberOfPositiveVoters * 100) / numberOfVoters;
        return acceptanceRatio < roleBindingQuorum && quorumProposal.voters.length == numberOfVoters;
    }

    /**
     * @dev Give your vote to a DeploymentProposal for the given newly deployed contract address
     * @param newDeployment address of the newly deployed contract
     * @param accept indicates that you accept the proposal
     */
    function voteDeploymentProposal(address newDeployment, bool accept) public isVoter dpExists(newDeployment) dpNotVoted(newDeployment) {
        DeploymentProposal storage deploymentProposal = deploymentProposals[newDeployment];
        deploymentProposal.voters.push(msg.sender);
        if (accept) {
            deploymentProposal.numberOfPositiveVoters++;
        } else {
            deploymentProposal.numberOfNegativeVoters++;
        }
        emit DeploymentVoteCast(msg.sender, newDeployment, accept);

        if (deploymentProposalAccepted(newDeployment)) {
            applicationContract = newDeployment;
            deploymentProposal.state = ProposalState.ACCEPTED;
            emit DeploymentAccepted(newDeployment);
        } else if (deploymentProposalRejected(newDeployment)) {
            deploymentProposal.state = ProposalState.REJECTED;
            emit DeploymentRejected(newDeployment);
        }
    }

    /**
     * @dev Public view into the state of a DeploymentProposal: was it accepted?
     * @param newDeployment address of the newly deployed contract to check
     */
    function deploymentProposalAccepted(address newDeployment) public view dpExists(newDeployment) returns (bool) {
        DeploymentProposal memory deploymentProposal = deploymentProposals[newDeployment];
        uint acceptanceRatio = (deploymentProposal.numberOfPositiveVoters * 100) / numberOfVoters;
        return acceptanceRatio >= roleBindingQuorum;
    }

    /**
     * @dev Public view into the state of a DeploymentProposal: was it rejected?
     * @param newDeployment address of the newly deployed contract to check
     */
    function deploymentProposalRejected(address newDeployment) public view dpExists(newDeployment) returns (bool) {
        DeploymentProposal memory deploymentProposal = deploymentProposals[newDeployment];
        uint acceptanceRatio = (deploymentProposal.numberOfPositiveVoters * 100) / numberOfVoters;
        return acceptanceRatio < roleBindingQuorum && deploymentProposal.voters.length == numberOfVoters;
    }

    /**
     * @dev Trigger the acceptance/rejection of a DeploymentProposal after another operation may have changed the state of the proposal outside of the voting process.
     * @param newDeployment address of the newly deployed contract
     */
    function triggerDeploymentProposalCheck(address newDeployment) public isVoter dpExists(newDeployment) {
        DeploymentProposal storage deploymentProposal = deploymentProposals[newDeployment];
        if (deploymentProposal.state == ProposalState.ACTIVE) {
            if (deploymentProposalAccepted(newDeployment) && !deploymentProposalRejected(newDeployment)) {
                applicationContract = newDeployment;
                deploymentProposals[newDeployment].state = ProposalState.ACCEPTED;
                emit DeploymentAccepted(newDeployment);
            } else {
                deploymentProposals[newDeployment].state = ProposalState.REJECTED;
                emit DeploymentRejected(newDeployment);
            }
        }
    }
}