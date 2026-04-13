# Product Requirements Document (PRD)

**Product Name:** Uncle Grooming Hub  
**Version:** 1.0 — Structural Foundation  
**Status:** Skeleton (No Details Yet)  
**Author:** Product Team  
**Last Updated:** October 26, 2023

---

### 1. Project Overview

Purpose: Define the vision, problem space, and guiding philosophy of the Uncle Grooming Hub platform.

#### **1.1 Vision Statement**

`Uncle Grooming Hub SHALL` redefine the premium grooming experience in Addis Ababa by merging artisanal craftsmanship with an elite, "Cinema Dark" digital ecosystem. The vision is to establish a high-transparency, zero-friction operational environment where artisanal skill is supported by sophisticated, offline-first technology, ensuring that every client interaction is professional, predictable, and visually coherent and operationally legible.

#### **1.2 Core Objectives**

- **Zero-Friction Client Participation:** Facilitate immediate entry into the service lifecycle through a guest-native check-in process that eliminates mandatory account creation.
- **Total Financial Integrity:** Implement an immutable, itemized ledger that ensures 100% transparency in shared business revenue and individual barber tips.
- **Absolute Operational Resilience:** Ensure uninterrupted operational capability for queue and payment workflows during connectivity disruptions through local-first execution.
- **Ambient Information Symmetry:** Provide real-time, high-contrast visual clarity of the queue state to both staff and clientele, eliminating wait-time anxiety.

#### **1.3 Market Context (Addis Ababa Environment)**

The luxury grooming sector in Addis Ababa operates within a unique "infrastructure-expectation gap." While high-net-worth clients demand a seamless, premium digital experience—including support for local digital payment powerhouses like Telebirr and Chapa—frequent ISP instability and power fluctuations often force establishments to revert to manual paper-based systems. Uncle Grooming Hub bridges this gap by deploying a sophisticated local-first architecture that provides a "luxury-digital" interface that functions autonomously while maintaining eventual cloud synchronization.

#### **1.4 Problem Definition**

- **Wait-Time Anxiety:** Invisible or perceived unfairness in queues leads to significant "walk-away" revenue loss and diminished client trust.
- **Revenue Leakage:** Manual tallying and non-itemized paper recording create systematic vulnerabilities for unrecorded transactions and misallocated barber tips.
- **Operational Fragility:** Existing cloud-dependent POS systems become liabilities during Addis Ababa’s frequent connectivity outages, causing data loss and service chaos.
- **Administrative Blindness:** A lack of real-time operational data prevents management from optimizing barber utilization and identifying peak bottleneck periods.

#### **1.5 Phase 1 Scope**

- **Cinema-Dark Public Status Board:** A high-contrast, passive display for ambient shop-wide queue awareness.
- **The Dual-Queue Engine:** A localized logic layer managing the Global Arrival Queue and specific Barber Lane constraints.
- **The Integrated Partner POS:** An offline-first interface for the Cashier and Barbers to manage check-ins, service starts, and itemized payment recording.
- **Deterministic Sync Layer:** A robust synchronization architecture (RxDB + Supabase) for local-to-cloud data reconciliation.
- **Financial Intent Model:** Support for Cash and Webhook-verified digital payments (Chapa/Telebirr) tied to unique transaction IDs.

#### **1.6 Non-Goals (Explicit Exclusions)**

- **Remote/Off-Site Booking:** Phase 1 SHALL focus exclusively on on-site queue management; home-based appointment scheduling is excluded.
- **Human Resource Management:** The system MUST NOT manage staff payroll, internal HR documentation, or performance reviews.
- **Retail Inventory Management:** Detailed stock-taking and supply chain management for retail products are outside the initial scope.
- **Multi-Branch Aggregation:** Centralized management of multiple physical locations is deferred to a future expansion phase.

#### **1.7 Product Principles**

- **Offline as a Standard State:** Connectivity loss SHALL NOT be treated as a failure; the system MUST maintain 100% operational capability in local-only environments.
- **Immutable Ledger Authority:** Financial records MUST be append-only; any corrections SHALL be executed through reversal entries rather than deletions or edits.
- **Barber Partnership Autonomy:** The system SHALL preserve the partnership model by strictly isolating barber tip wallets and respecting individual lane preferences.
- **Operational Truth is Local:** For active service sessions, the local shop terminal SHALL be the primary source of truth, with the cloud acting as the canonical historical and analytical source of truth.
- **Design for Focus:** The interface MUST prioritize high-contrast, "Cinema Dark" aesthetics to minimize cognitive load and complement the premium shop atmosphere.
- **Distributed Operational Authority:**
  Decision-making is shared between customer preference,
  barber autonomy, and system logic rather than centralized control.
  **Design Principle:**

- Technology should elevate the craft, never distract from it.

---

### 2. Stakeholder & Role Model (RBAC)

Purpose: Define all actors interacting with the system.

#### **2.1 Actor Definitions**

- **Customer:** The recipient of grooming services; interacts with the platform via the Public Status Board for queue visibility and via personal devices for payment intent fulfillment.
- **Barber:** A revenue-sharing partner responsible for service delivery, managing their specific lane status, and receiving individual tips through the virtual wallet system.
- **Cashier:** The operational coordinator responsible for front-of-house activities, including customer check-in, manual queue routing, and manual cash settlement confirmation.
- **Admin:** A functional role responsible for system configuration, price registry management, barber roster updates, and high-level financial audit resolution.
- **System Actor:** The automated background service layer responsible for cross-platform data synchronization, payment webhook processing, and enforcement of ledger integrity.

#### **2.2 Responsibilities Matrix**

- **Queue Management:** Cashier assists(Initial check-in and reassignment); Barber (Lane-specific availability and status updates).
- **Transaction Initiation:** Barber (Triggers the transition to `In-Progress` and initializes the transaction record at service start).
- **Payment Settlement:** Cashier (Manual verification of cash funds); System Actor (Automated verification of digital payment webhooks).
- **Financial Configuration:** Admin (Maintenance of the fixed-price registry and partnership revenue sharing parameters).
- **Sync & Integrity:** System Actor (Deterministic reconciliation of local terminal data with the cloud canonical source of truth).

#### **2.3 Permission Boundaries**

- **Barber Permissions:** Limited to lane status toggling and viewing personal tip history; no access to shared business revenue reports or other barbers' performance data.
- **Cashier Permissions:** Authorized for queue manipulation and cash payment confirmation; restricted from modifying service prices, deleting transaction logs, or accessing Admin settings.
- **Admin Permissions:** Full access to operational configurations and audit logs; restricted from modifying immutable "Settled" transaction records (adjustments must be via new reversal entries).
- **Customer Permissions:** Read-only access to wait-list status; write access limited to initializing a payment intent for their specific `transaction_id`.
- **System Actor Permissions:** Exclusive authority to perform background ledger synchronization and encrypted state-journaling.

#### **2.4 Access Control Philosophy**

- **Shared-Device Security:** Given the use of shared physical terminals, the system MUST support rapid, low-friction authentication (e.g., PIN-based or NFC-tag login) for session-based role switching.
- **Local Validation:** All permission checks MUST be performed locally on the shop terminal to ensure the system remains fully operational and secure during internet outages.
- **Partnership Transparency:** To support the shared partnership model, every write action MUST be appended with a persistent Actor-ID and timestamp to ensure accountability across all participants.
- **Principle of Least Privilege:** Actors are granted the minimum functionality necessary for their operational role; administrative or high-impact financial actions are restricted to designated Admin sessions.

---

### 3. Operational Model

Purpose: Translate real salon operations into system workflows.

#### **3.1 Service Lifecycle (Arrival → Queue → Service → Payment → Exit)**

- **Check-in:** System must capture customer entry via manual cashier entry or QR scan, transitioning status to `Waiting`.
- **Queue Entry:** Customer is appended to the `Master Queue` and assigned to either a `Specific Barber` lane or the `First Available` pool.
- **Engagement:** When a barber becomes free, the system updates the status to `In-Progress`, timestamps the service start, and creates an immutable transaction record with a unique transaction_id.
- **Completion:** Barber marks service as finished, transitioning the record to `Pending Payment` and releasing the barber to the `Available` state.
- **Settlement:** Cashier confirms receipt of Cash funds; Digital payments are confirmed only via backend webhook verification to transition status to `Completed` and trigger the `Exit` event.

#### **3.2 Barber Availability Rules**

- **Status Toggles:** Barbers must have four distinct states: `Available`, `In-Service`, `On-Break`, and `Offline`.
- **Session Persistence:** Active service states must persist across local network fluctuations to prevent "ghost" availability.
- **Automatic Transition:** Completion of a service record must automatically move the barber to `Available` unless a `Break` is pre-flagged.
- **Conflict Prevention:** The system must block assignment to any barber currently in `In-Service` or `On-Break` states.

#### **3.3 Shop Operational Constraints**

- **Operating Hours:** The system must enforce a hard "Open/Closed" toggle that prevents queue entry outside of defined Addis Ababa shop hours.
- **Local-First Master:** The local shop device enables offline operations, though the cloud database remains the canonical financial source of truth following synchronization.
- **Maximum Occupancy:** The system must allow admins to set a `Queue Cap` to prevent infinite waitlists during peak hours or power outages.
- **Hardware Tethering:** Operational workflows must remain functional on the local area network (LAN) even if the external ISP connection is severed.

#### **3.4 Exception Handling Scenarios**

- **No-Show Policy:** System must allow a "Skip" or "Cancel" action if a customer is not present when called, moving them to an `Expired` state.
- **Power/Internet Outage:** Data must be cached locally on the device; reconciliation with the central server must occur automatically upon restoration.
- **Barber Reassignment:** In the event of a barber emergency, the system must support moving an `In-Queue` customer from one barber lane to another without losing their relative priority.
- **Payment Reversal:** If a digital payment fails, the transaction must return to the `Pending Payment` state for retry or manual cashier resolution.

---

### 4. Identity & Authentication Model

Purpose: Define user identity lifecycle.

#### **4.1 Guest-First Architecture**

- **Zero-Friction Check-in:** The system shall support immediate service entry without requiring pre-registration, email, or password creation at the point of arrival.
- **Voluntary Registration:** Formal account creation (registration) must be an optional post-service or value-add step, rather than a prerequisite for queue entry.
- **Transient Session Management:** Local shop terminals must support transient customer sessions that allow for service selection and status tracking without requiring a persistent login state.

#### **4.2 Shadow Profiles**

- **Automatic Identity Creation:** The system must automatically generate a persistent "Shadow Profile" assigned to a globally unique system-generated identifier (UUID) for every walk-in check-in.
- **Historical Persistence:** Shadow Profiles must serve as the repository for all service history, barber preferences, and transaction records associated with a specific system-generated identifier, even if the user has not "registered."
- **Offline Availability:** Shadow Profiles created on a local shop terminal must be searchable and editable in offline mode, with reconciliation to the cloud occurring once connectivity is restored.

#### **4.3 Account Conversion Flow**

- **Profile Promotion:** The system must provide a mechanism to "promote" a Shadow Profile to a Registered Account via a verification event (e.g., SMS OTP).
- **Data Inheritance:** Upon successful verification, all historical data, preferences, and loyalty points associated with the Shadow Profile must be merged into the new Registered Account.
- **Idempotent Conversion:** Registration attempts using a secondary identifier (e.g., phone number) already linked to a Shadow Profile must trigger a merge request rather than creating a duplicate identity.

#### **4.4 Identity Linking Rules**

- **Primary Key Definition:** A system-generated immutable UUID shall serve as the unique primary identifier for identity reconciliation across both local and cloud databases.
- **Secondary Identification:** Mobile phone numbers are treated as secondary verified identifiers used exclusively for profile lookup, authentication, and linking.
- **Conflict Resolution:** In the event of identity conflicts during offline-to-cloud synchronization, the system shall prioritize the most recent transaction timestamp as the authoritative state for profile metadata.
- **Deduplication Logic:** The system must identify and flag potential duplicate profiles (e.g., similar names with identical secondary identifiers) for administrative cleanup during the sync process.

#### **4.5 Security Assumptions**

- **Operator Trust Model:** The Cashier and Admin roles are defined as "Trusted Operators" with the authority to create and modify guest identities on behalf of customers within the physical shop environment.
- **Shared Terminal Security:** Application sessions on shop-owned devices must be role-based and time-limited to prevent unauthorized access to administrative functions.
- **Transaction-Level Verification:** Sensitive actions, such as account balance inquiries or profile deletions, must require out-of-band verification (OTP) regardless of the user’s registration status.
- **Data Minimization:** To mitigate risks in shared environments, the system shall avoid storing sensitive PII (Personally Identifiable Information) on local shop terminals beyond what is operationally necessary for service fulfillment.

---

### 5. Queue Engine Architecture

Purpose: Define customer flow logic.

#### **5.1 Queue Philosophy**

- **Local Sovereignty:** The queue must be managed by the local shop server to ensure zero-latency updates regardless of internet connectivity.
- **Preference Priority:** Customer preference is strictly respected, prioritizing individual choice over system-level barber utilization efficiency.
- **Human-in-the-Loop Authority:** The system facilitates the queue via recommendations, while final assignment and rebalancing authority remains with the Cashier or Admin.

#### **5.2 Global Queue Model**

- **Global Queue:** The single, arrival-ordered source of truth for all waiting customers in the system.
- **Logical Lane Views:** Filtered perspectives of the global queue that display only the customers compatible with a specific barber's availability based on their stored constraints.

#### **5.3 Assignment Logic**

- **Eligibility Recommendations:** When a barber becomes free, the system highlights the earliest compatible customer from the Global Queue. It does not perform automatic assignments.
- **Preference Continuity:** Customer-barber pairings are strictly preserved as defined at check-in; the system does not automatically rebalance customers between barbers to optimize idle time.
- **Manual Reassignment:** Cashier or Admin may manually reassign a customer to a different barber only with customer consent.
- **Constraint Preservation:** A barber may remain idle if the next recommended customer in the Global Queue opts to wait for their specific preferred barber.

#### **5.4 Queue States & Transitions**

- `Waiting`: Customer has checked in and is placed in the Global Queue with relevant barber constraints.
- `Called`: An eligible customer has been manually selected by Cashier or Admin for service;
  the barber state transitions from `Available` to `Pending Engagement`.
- `Engaged`: Service has started; transaction record is initialized, and the customer is removed from the active queue.
- `Expired`: Customer was `Called` but did not appear within the grace period; record moves to an inactive state.
- `Cancelled`: Manual removal from the queue by the Cashier or Customer.

#### **5.5 Real-Time Update Model**

- **LAN Broadcast:** The local server must broadcast state changes via WebSocket or similar protocol to all connected shop devices (Status Board, Barber tablets) over the local network.
- **Cloud Shadowing:** The local queue state is asynchronously mirrored to the cloud for remote monitoring; however, the local server remains the arbiter for state transitions to prevent "double-calling" during sync lags.
- **Conflict Resolution:** In the event of a local server restart, the queue is rebuilt from the local persistent database to maintain the exact arrival sequence.

---

### 6. Payment & Financial Architecture

Purpose: Define transactional integrity and payment lifecycle.

#### **6.1 Wallet Model**

- **Virtual Accounting Layer:** The system shall maintain virtual wallets as logical accounting entities; actual currency is never stored or moved within the application.
- **Derivation Principle:** Wallet balances are dynamically calculated from immutable ledger entries; the system shall not store mutable "running balance" fields to prevent data drift.
- **Shared Business Wallet:** A centralized virtual ledger representing the total shared revenue generated from fixed-price services.
- **Barber Partnership Wallets:** Individual virtual ledgers for each barber to track personal earnings derived exclusively from customer tips (excess payments above service price).
- **Zero-Commission Policy:** The system architecture must ensure that 100% of the transacted value is allocated to either the shared business wallet or the specific barber’s wallet without platform deductions.

#### **6.2 Ledger System (Source of Truth)**

- **Immutable Transaction Logs:** All financial entries must be append-only; existing records cannot be edited or deleted. Corrections must be executed as distinct reversal/adjustment entries.
- **Itemized Allocation:** Every ledger entry must support itemization, distinguishing between the fixed service price (Revenue) and the customer-added excess (Tip) at the point of creation.
- **Cloud Canonical Authority:** While the local shop database manages real-time operations, the Cloud database serves as the final canonical financial source of truth. In the event of a sync conflict, the Cloud-reconciled state prevails.
- **Audit Metadata:** Every entry must be signed with a `terminal_id`, `cashier_id`, and a unique `global_transaction_uuid`.

#### **6.3 Payment Session (QR Intent Model)**

- **Unique Intent Binding:** Each transaction shall generate a unique payment intent tied to a specific `transaction_id`.
- **Total Locking:** The final total (`Service Price + User-Defined Tip`) must be locked once the session transitions to the `Processing` state to prevent mid-payment price tampering.
- **QR Representation:** QR codes must serve as pointers to a specific payment intent; they are stateless and do not represent account balances.
- **Session Expiry:** Payment intents must have a defined Time-to-Live (TTL). Expired intents must be explicitly invalidated before a new session can be initialized. Locked totals must remain immutable across retries of the same payment intent.

#### **6.4 Gateway Integration Layer**

- **Standardized Provider Interface:** Integration for Chapa, Telebirr, CBE Birr, and M-Pesa must map provider-specific statuses to internal system states.
- **Gateway Reference IDs:** The system must store the external gateway’s unique transaction reference for every digital payment to facilitate bank-level reconciliation.
- **Total Sum Transmission:** Gateways shall receive only the aggregate total; internal revenue splitting is handled exclusively by the system ledger after confirmation.

#### **6.5 Transaction Lifecycle States**

- `Initialized`: Created automatically when service begins; no financial impact.
- `Payment_Pending`: Service is complete; payment total is calculated and locked.
- `Processing`: Customer redirected to gateway or cash payment initiated; awaiting verification.
- `Settled`: Funds verified via webhook or manual cashier action; virtual wallets updated.
- `Failed`: Gateway rejection or timeout; allows for payment method retry or cancellation.
- `Reconciled`: Final audit state indicating the transaction matches between local and cloud ledgers.

#### **6.6 Double-Entry Accounting Logic**

- **Balanced Distribution:** Successful payments trigger a Debit to the Payment Method account and corresponding Credits to the Shared Revenue and Barber Tip accounts.
- **Price Integrity Check:** The system must validate the `Service Price` against the Global Price Registry at the time of settlement to prevent unauthorized manual price changes.
- **Integrity Constraint:** The sum of all ledger entries for a single `transaction_id` must always equal zero.

#### **6.7 Payment Verification (Webhook Model)**

- **Authoritative Webhooks:** Digital payment success is determined solely by verified server-to-server webhooks; client-side success signals are discarded for state transitions.
- **Verification Fallback:** The system shall implement server-side polling for digital payments when a webhook is not received within a defined threshold to resolve "Processing" states.
- **Cash Accountability:** Cash payments require explicit manual confirmation by an authorized `Cashier_ID`, creating a specific ledger event for that user.

#### **6.8 Refund & Adjustment Rules**

- **Non-Destructive Adjustments:** Refunds must be recorded as new "reversal" entries linked to the original `transaction_id`. Original entries remain unchanged.
- **Manual Authority:** Only Admin roles can authorize adjustments; all actions require a mandatory reason code and are subject to audit logs.
- **Tip Reversal Policy:** In the event of a full refund, the associated barber tip must be debited from the individual barber’s virtual balance to maintain business revenue integrity.

> Partial refunds must proportionally reverse shared revenue and barber tip allocations based on the refunded amount relative to the original transaction total.

---

### 7. Loyalty & Gamification (Phase 2)

Purpose: Outline the secondary engagement layer designed to increase client retention, reinforce brand identity, and reward consistent patronage without compromising the premium, low-friction experience.

#### **7.1 Reward Philosophy**

The Uncle Grooming Hub loyalty system SHALL function as a recognition framework, not a discount engine. The system MUST reward consistency, trust, and craftsmanship appreciation rather than incentivizing price sensitivity.

- **Prestige over Discounts:** Rewards SHALL enhance experience quality (e.g., complimentary premium beverage service, priority access to specific grooming tools, or extended consultation time) rather than reduce service value through price reductions.
- **Passive Participation:** Clients MUST accumulate benefits automatically via their system-generated UUID (Shadow Profile/Registered Account) without requiring active tracking or mobile application interaction.
- **Transparency Without Noise:** Progress visibility SHALL be available upon check-in but MUST remain subtle and non-intrusive, preserving the "Cinema Dark" aesthetic.
- **Craft Appreciation:** Loyalty metrics SHALL reflect relationship longevity with specific barbers, reinforcing the partnership model through "Barber Bond" multipliers.
- **Status Signaling:** Tier progression SHALL communicate exclusivity and belonging within the Hub ecosystem through ambient interface cues.

#### **7.2 Points System Model**

The system SHALL implement a deterministic, ledger-backed point allocation mechanism where "Recognition Units" (Points) are treated as non-mutable audit events.

- **Point Derivation:** Points SHALL be derived exclusively from completed and verified transactions recorded in the local append-only ledger.
- **Allocation Logic:**
  - **Base Volume:** 1 point per 100 ETB of service value (rounded down).
  - **Barber Retention Multiplier:** A 1.2x multiplier SHALL apply to services performed by the same barber for three or more consecutive visits.
  - **Streak Multiplier:** Consecutive monthly visits SHALL trigger a compounding 0.1x bonus (capped at 1.5x).
  - **Digital-First Bonus Safety:** Digital-settlement bonuses SHALL be initialized at the point of payment intent generation on the local terminal. Final point allocation MUST occur only upon receipt of an authoritative digital settlement webhook. In offline scenarios, the intent SHALL be journaled locally and processed retroactively upon cloud reconciliation, ensuring the operational flow remains independent of gateway success timing.
- **Recognition Unit calculations:** SHALL be deterministic and
  recomputable from ledger history to allow full system rebuild
  without loss of loyalty state.

- **Technical Constraints:**
  - **Immutable Entries:** Points MUST be appended as unique event types in the ledger; the system SHALL NOT support direct mutation of a "balance" field.
  - **Offline Validation:** Points SHALL be calculated and displayed locally at the terminal using the local event journal; however, they remain in a `Pending_Verification` state until cloud synchronization occurs.
  - **Reversal Protocol:** Financial refunds or transaction voiding MUST trigger a compensating ledger event to deduct the corresponding points, maintaining zero-sum integrity.

#### **7.3 Tier Progression Logic**

Clients SHALL progress through recognition tiers based on a 12-month rolling window of cumulative engagement points.

- **Tier Structure:**
  1. **Visitor:** Default entry state for new or infrequent guests (0–499 points).
  2. **Regular:** Threshold achieved after 500 points; unlocks basic profile personalization.
  3. **Patron:** Achieved after 1,500 points; grants access to "Soft Priority" queue weighting.
  4. **Inner Circle:** Elite recognition tier (top 5% engagement); grants access to exclusive service add-ons.
- **Soft Priority (Tie-Breaker Logic):**
  - **Priority Bias Value:** For "First Available" assignments, high-tier members (Patron/Inner Circle) SHALL receive a deterministic "Virtual Arrival Offset" (VAO) to their actual arrival timestamp.
  - **Fairness Boundary Invariant:** The VAO SHALL be fixed at -15 minutes. To prevent queue destabilization, the system MUST NOT allow a prioritized customer to displace any client whose verified arrival timestamp is more than 20 minutes earlier than the prioritized customer’s actual arrival.
  - **Constraint Preservation:** This bias SHALL ONLY apply for sorting within the First-Available pool and MUST NOT override a "Specific Barber" request.
  - **Visual Neutrality:** Priority status MUST NOT be broadcast on the Public Status Board to preserve the perception of universal operational fairness.
- **Maintenance Logic:**
  - **Automatic Promotion:** Tier upgrades SHALL execute immediately upon local ledger threshold fulfillment.
  - **Rolling Attrition:** Evaluation SHALL occur on a rolling 12-month basis. Points older than 365 days SHALL be excluded from the tier calculation, potentially resulting in a tier downgrade.

#### **7.4 Trigger Events**

Engagement events SHALL be system-driven and context-aware, triggered by specific state transitions within the operational model.

- **Behavioral Triggers:**
  - `Milestone_Reached`: Triggered upon the 10th, 25th, and 50th verified service events.
  - `Barber_Bond_Achieved`: Triggered upon the 5th consecutive session with a specific partner barber.
- **Temporal Triggers:**
  - `Identity_Anniversary`: System recognition of the one-year mark of the UUID creation.
  - `Velocity_Incentive`: Contextual prompts for "Regular" members to visit during documented low-velocity hours to earn "Quiet Hours" Recognition Units.
- **Operational Triggers:**
  - `Service_Unlock_Notification`: Discreet notification to "Inner Circle" members when specialized artisanal treatments are available.
- **Technical Invariants:**
  - **Trigger Idempotency:** Every engagement event SHALL be assigned a deterministic `event_uuid` derived from the cryptographic hash of the originating `transaction_uuid` and the `trigger_type_id`. This ensures duplicate loyalty events are suppressed during multi-terminal synchronization.
  - **Ambient Delivery:** Notifications SHALL be delivered solely via the check-in terminal greeting or the itemized digital receipt.
  - **Push Proscription:** The system MUST NOT utilize invasive push notifications or marketing SMS; all communications MUST remain premium and service-oriented.
  - **Sync Requirements:** All triggers MUST be generated by the `Engagement_Event_Dispatcher` locally and reconciled asynchronously with the cloud ledger.

---

### 8. Feedback & Quality Assurance

Purpose: Establish mechanisms for service evaluation and quality control.

#### **8.1 Verified Service Feedback Rule**

- **Transactional Coupling:** Feedback submission SHALL be strictly gated by a verified `Settled` transaction state. The system MUST NOT permit feedback entry without a corresponding `transaction_uuid` in the local ledger.
- **Single-Event Invariant:** Each unique `transaction_uuid` SHALL allow exactly one feedback event. Subsequent attempts to append feedback to the same identifier MUST be rejected by the system logic.
- **Temporal Window:** The eligibility window for feedback submission SHALL be limited to 48 hours post-settlement. After this period, the feedback interface for that specific transaction MUST be disabled.
- **Offline Persistence:** Feedback events SHALL be journaled locally as append-only events and MUST be reconciled with the cloud ledger using the same deterministic sync logic defined in Section 10.

#### **8.2 Rating Model**

- **Multi-Dimensional Metrics:** The system SHALL utilize discrete, non-public ratings across three categories: Technical Craft, Professionalism, and Punctuality.
- **Binary vs. Scalar Logic:** Ratings SHALL be captured on a 5-point discrete scale. Qualitative comments SHALL be optional and stored as encrypted text attributes of the feedback event.
- **Privacy Invariant:** Individual ratings MUST NOT be displayed on the Public Status Board or any customer-facing interface. Service quality data is intended for internal operational optimization and barber partnership reviews only.
- **Barber Dignity Protection:** To prevent immediate social discomfort within the physical shop environment, feedback results SHALL NOT be surfaced to the barber in real-time.

#### **8.3 Alert Triggers**

- **Low-Threshold Trigger:** An `Automatic_Quality_Alert` SHALL be generated and routed to the Admin Dashboard if a barber’s aggregate rating for Technical Craft falls below a deterministic threshold (e.g., 3.5/5.0) over a rolling 30-day window.
- **Critical Negative Event:** Any rating of 1/5 SHALL trigger an immediate `Priority_Review_Flag` in the Admin Control Panel for investigation.
- **Pattern Recognition:** The system MUST identify and trigger an alert for "Service Variance"—defined as a standard deviation in ratings exceeding 1.5 points over 10 consecutive services.
- **Recognition Trigger:** An `Exceptional_Craft_Badge` event SHALL be triggered when a barber maintains a 4.8/5.0 average across 50 verified transactions, influencing "Inner Circle" client recommendations.
- **Alert evaluation:** SHALL require a minimum of 10 verified feedback events within the evaluation window.

#### **8.4 Moderation Workflow**

- **Aggregation for Anonymity:** To protect customer anonymity and preserve the barber-client relationship, feedback data SHALL only be visible to the barber in aggregate form (batches of 5 or more entries).
- **Dispute Ledger:** Barbers MAY flag specific aggregate feedback for "Partner Review" if they believe the data reflects a systemic error or hardware malfunction.
- **Admin Modification Rule:** Admins SHALL NOT have the authority to edit or delete individual feedback events; corrections MUST be recorded as `Feedback_Adjustment` events in the immutable ledger.
- **Audit Trail:** Every access to feedback data by an Admin or Cashier MUST be logged as a `Quality_Data_Access_Event` to ensure privacy compliance and data ownership integrity.

---

### 9. Failure & Recovery Design

Purpose: Define system resilience and error mitigation strategies.

#### **9.1 Network Failure Handling**

- **Autonomous Operation Invariant:** The system SHALL transition to `Local_Autonomous_Mode` immediately upon detection of internet backhaul failure. All operational functions, including customer check-in, queue transitions, and service engagement, MUST remain fully functional without external dependencies.
- **Event Journaling:** Every state transition occurring during a network failure MUST be captured as an immutable event in the local append-only journal, assigned a `local_sequence_id` and a UTC-normalized timestamp.
- **Sync Health Visibility:** The UI SHALL provide a discrete, high-contrast indicator of synchronization status (e.g., "Locally Committed") to ensure staff awareness without disrupting the premium "Cinema Dark" aesthetic.
- **Automatic Egress Recovery:** Upon restoration of connectivity, the system SHALL automatically initiate a prioritized synchronization of the event journal, processing financial ledger events before operational queue telemetry.

- **Graceful Degradation Rule:** During prolonged network failure,
  non-essential cloud-dependent features (analytics dashboards,
  loyalty synchronization, remote configuration updates)
  SHALL automatically suspend without impacting core operations.

#### **9.2 Device Failure Recovery**

- **Role Portability:** Barber and Cashier sessions MUST be hardware-independent. In the event of a terminal hardware failure, an operator SHALL be able to authenticate on a secondary shop terminal and recover their active state (e.g., active lane, current service engagement).
- **State Reconstitution:** Upon re-authentication following a device crash, the local database SHALL replay the un-synchronized portion of the local event journal to reconstitute the exact operational state prior to the failure.
- **Local Peer Replication:** In multi-terminal shop environments, the system SHOULD utilize local area network (LAN) replication to ensure that the Global Queue and active transaction registry exist on at least two physical devices simultaneously.
- **Cold-Start Recovery:** The system MUST support a "Cold-Start" procedure where a new terminal can download the entire current shop state from the cloud canonical archive, assuming internet connectivity is available.

#### **9.3 Payment Reconciliation Recovery**

- **Digital Intent Persistence:** Digital payment intents (QR-based) generated while offline MUST remain in a `Processing` state locally. The system SHALL NOT mark these as `Settled` until a verified webhook or gateway status poll is confirmed post-reconnection.
- **Reconciliation Loop:** Upon reconnection, the System Actor SHALL execute a `Reconciliation_Sweep` for all transactions in the `Processing` state, querying gateway providers (e.g., Chapa, Telebirr) to verify settlement status.
- **Manual Settlement Fallback:** If a digital payment cannot be verified via automated reconciliation after a defined threshold (e.g., 2 hours), the system SHALL allow a Cashier to manually flag the transaction for "Administrative Review" or convert it to a `Cash_Settlement` event.
- **Double-Entry Integrity:** Any recovery action involving a payment state change MUST be recorded as a new, linked ledger event to maintain a perfect audit trail of the correction.

#### **9.4 Data Conflict Resolution**

- **Deterministic Sequence Rule:** Conflicts between local and cloud states SHALL be resolved using a monotonic sequence counter combined with the `transaction_uuid`. The system SHALL NOT rely exclusively on wall-clock time for conflict resolution.
- **Financial Additivity Invariant:** The financial ledger is append-only. If a conflict occurs regarding a transaction amount or payment type, the system SHALL create a `Discrepancy_Event` and preserve both records for Admin audit rather than overwriting either entry.
- **Operational State Logic:** For non-financial queue states (e.g., "Engaged" vs. "Waiting"), the local terminal SHALL be treated as the authoritative source of truth for all events occurring within the last 12 hours of local operation.
- **LWW (Last Write Wins) Boundary:** In cases of profile metadata updates (e.g., name correction), the system SHALL apply a `Last-Write-Wins` policy based on the event with the highest monotonic sequence ID across the distributed environment.

---

### 10. Offline-First & Sync Architecture

Purpose: Address connectivity constraints via local persistence and synchronization.

#### **10.1 Local Database Strategy**

- **Immutable Event Journaling:** Local terminals SHALL maintain an append-only event log for all state changes (e.g., `Queue_Joined`, `Service_Started`, `Payment_Settled`) rather than merely syncing mutable record states.
- **Operational Data Scope:** The local database MUST store the current operational snapshot (Global Queue, Barber Roster) and the full un-synced portion of the financial event journal.
- **Write-Ahead Logging (WAL):** To ensure transaction atomicity, the system MUST utilize WAL to prevent log corruption during power interruptions or hardware failure.
- **Device-Bound Encryption:** All local data at rest SHALL be encrypted using hardware-backed keys (e.g., TEE/TPM) to prevent unauthorized extraction of the event journal.
- **Local Authority Invariant:** During connectivity loss, the local event journal is the authoritative record of shop operations. No cloud-side state may override un-synced local financial events.

#### **10.2 Sync Scheduling Model**

- **Priority-Based Egress:** The sync engine MUST prioritize `Financial` and `Identity_Creation` events over `Operational` updates (e.g., queue reordering) during limited bandwidth windows.
- **Exponential Backoff Strategy:** In the event of gateway timeouts, the engine SHALL implement exponential backoff with jitter to prevent local resource exhaustion and "retry storms."
- **Atomic Batch Integrity:** Data MUST be transmitted in logically consistent event batches. A batch is only marked "Synced" upon a verified receipt of a server-side commitment to the canonical ledger.
- **Connectivity Detection:** The system SHALL utilize passive monitoring of API responses to detect "flapping" connections, suppressing sync attempts until a stable handshake threshold is met.
- **Manual Reconciliation Trigger:** The Admin interface SHALL provide a "Force Reconcile" option to manually push pending event batches before terminal closure.

#### **10.3 Conflict Resolution Rules**

- **Logical Ordering Invariant:** To mitigate device clock drift, the system MUST use a combination of immutable UUIDs and monotonic sequence counters to determine event order, rather than relying solely on wall-clock timestamps.
- **Append-Only Ledger Logic:** Financial conflicts SHALL be resolved via an additive-only reconciliation model. The system MUST NOT permit "update" or "delete" operations on synced financial events.
- **Authority Hierarchy:** The Cloud serves as the definitive arbiter for global configuration (Price Lists, Roles), while the Local terminal maintains authority over the sequence and status of active shop sessions.
- **Queue Integrity Resolution:** In cases of conflicting queue states (e.g., `Expired` vs. `Engaged`), the event with the earliest verified sequence number in the global chain SHALL be considered authoritative.
- **Divergence Flagging:** Any sync attempt that results in a state divergence that cannot be logically reconciled MUST be quarantined for manual Admin intervention.

#### **10.4 Eventual Consistency Model**

- **State Transparency:** The UI MUST display explicit sync status indicators: `Local_Only` (un-synced event), `Transmitting`, and `Cloud_Verified` (committed to canonical ledger).
- **Consistency Guarantee:** The system SHALL guarantee that the local terminal state and cloud state within 60-120 seconds under normal connectivity conditions of restored stable backhaul.
- **Prolonged Offline Recovery:** After extended offline periods (>24 hours), the system MUST perform a "Check-Sum Reconciliation" of the entire local journal against the cloud mirror before accepting new remote configuration updates.
- **Auditability Requirements:** Every sync event MUST generate a cryptographically signed audit entry in the cloud ledger, linking the `terminal_id` to the batch of sequence numbers processed.
- **Data Retention Policy:** Local event logs SHALL be retained until they are both "Cloud_Verified" and have surpassed a 7-day operational safety window to allow for manual audit verification.

---

### 11. Non-Functional Requirements

Purpose: Define technical constraints and performance benchmarks for the platform.

#### **11.1 Performance Targets**

> All performance targets assume minimum supported terminal hardware specification defined in Section X (Terminal Baseline).

- **Local UI Latency:** User interface interactions on shop terminals MUST respond within < 100ms to ensure a premium, lag-free experience, independent of cloud connectivity status.
- **Transaction Commits:** Local event journal writes SHALL be completed within < 50ms using ACID-compliant persistence to guarantee immediate operational feedback.
- **Reconciliation Throughput:** The synchronization layer MUST be capable of processing up to 5,000 pending event records per minute upon restoration of internet backhaul.
- **Resource Throttling:** Background synchronization processes SHALL NOT exceed 20% of the terminal’s CPU utilization to prevent operational degradation during peak shop hours.
- **Cold Boot Recovery:** In the event of a total power interruption, the local terminal MUST reach a fully operational "Ready" state within < 45 seconds of hardware reboot.

#### **11.2 Reliability Standards**

- **Operational Uptime:** Core queue management and payment recording functions SHALL remain continuously available during internet outages, subject only to local hardware operability.
- **Data Durability:** The system MUST ensure zero data loss for local events; all un-synced entries SHALL be persisted in non-volatile storage via Write-Ahead Logging (WAL).
- **Idempotency Invariant:** The synchronization engine SHALL implement strict idempotency for all event batching to prevent duplicate ledger entries during unstable connection "flapping."
- **State Integrity:** Upon hardware failure, the system MUST support state reconstitution on a replacement terminal by replaying the cloud-mirrored event journal.

#### **11.3 Security Requirements**

- **Encryption at Rest:** All local database files SHALL be encrypted using AES-256 with keys managed through the terminal's hardware-backed Secure Enclave or Trusted Platform Module (TPM).
- **Encryption in Transit:** All data transmitted between the local terminal and cloud services MUST be secured via TLS 1.3 with mandatory certificate pinning.
- **Key Rotation:** Encryption keys SHALL support periodic rotation without requiring data re-encryption downtime.
- **Local RBAC Enforcement:** Role-based access controls SHALL be enforced by the local terminal using encrypted credential hashes stored on the device to allow secure operator switching while offline.
- **Audit Immutability:** The system SHALL generate a cryptographically signed audit trail for all administrative actions, rendering retroactive modification computationally detectable.
- **Device Authorization:** Only pre-authorized terminal hardware (verified via unique device fingerprints) SHALL be permitted to synchronize with the cloud canonical database.

#### **11.4 Scalability Expectations**

- **Local Data Capacity:** The local terminal database SHALL support the storage and performant indexing of at least 50,000 service events and 100,000 shadow profiles before requiring archival pruning.
- **Queue Throughput:** The local engine MUST support up to 25 concurrent barber lanes and a master queue depth of 500 active entries per physical shop location.
- **Event Journal Growth:** The system SHALL handle up to 2,000 operational events per barber per day without performance degradation or index fragmentation.
- **Concurrent Operator Sessions:** The terminal environment MUST support up to 10 concurrent background processing workers for handling real-time status board broadcasts, sync tasks, and local UI processing.

---

### 12. Data Ownership & Privacy

Purpose: Define data governance and access policies to ensure operational transparency, partner autonomy, and customer privacy.

#### **12.1 Data Ownership Definitions**

- **Shared Revenue Data:** All event records pertaining to fixed-price service transactions SHALL be owned collectively by the Shop Entity and governed under shop-level administrative authority.
- **Barber Tip Data:** Virtual wallet entries and ledger events classified as "Tips" SHALL be the exclusive property of the servicing Barber; the system MUST NOT permit the Shop Entity to claim ownership of these funds.
- **Customer Identity Data:** PII (Personally Identifiable Information) and service history associated with a unique UUID SHALL be owned by the Customer; the Platform acts as a data custodian.
- **Operational Metadata:** System-generated logs, queue telemetry, and synchronization metrics SHALL be the property of the Platform for the purpose of service optimization and technical audit.
- **Portability:** Upon partnership dissolution, a Barber SHALL have the right to export an itemized history of their personal service events and tip ledgers in a standard machine-readable format.

#### **12.2 Visibility Rules**

- **Role-Based Data Isolation:** The system SHALL enforce strict data silos at the local terminal level; Barbers MUST NOT have visibility into peer revenue, peer tip balances, or aggregate shop financial performance.
- **PII Exposure Minimization:** Cashiers and Barbers SHALL only view the minimum customer data required for active service fulfillment (e.g., First Name, Last Initial, and specific Barber Preference). Data visibility SHALL terminate immediately upon operator logout or role switch.
- **Financial Redaction:** The Public Status Board MUST NOT display any financial information, service prices, or customer loyalty tiers.
- **Administrative Oversight:** Only users authenticated with the "Admin" role SHALL be permitted to view shop-wide aggregate financial reports and full-service audit logs.
- **Offline Data Visibility:** In the event of a network outage, local terminals SHALL only display data currently cached in the local encrypted database; historical cloud-only records MUST remain inaccessible until connectivity is restored.

#### **12.3 Audit Trail Policy**

- **Event Immutability:** Every state transition in the system MUST be recorded as an append-only event; the system SHALL NOT support the `UPDATE` or `DELETE` of existing financial or operational records.
- **Actor Attribution:** All events recorded in the local journal MUST be cryptographically linked to a `Terminal_ID`, `Actor_ID` (Operator), and a monotonic sequence counter to ensure a non-repudiable history.
- **Sync Integrity Audit:** The synchronization layer SHALL maintain a "Sync Ledger" documenting every successful and failed data transfer between the local terminal and the cloud canonical store.
- **Correction Transparency:** Any correction to a transaction MUST be executed as a new `Adjustment_Event` referencing the original `UUID`, ensuring the original error remains visible in the audit trail.
- **Access Logging:** The system SHALL record an audit entry for every instance an Admin accesses sensitive financial or PII data.

#### **12.4 Retention Strategy**

- **Local Pruning:** Local shop terminals SHALL retain verified and synchronized events for a minimum of 30 days and MAY prune thereafter when synchronization health is confirmed; records older than this window MUST be purged from the local database after cloud confirmation.
- **Cloud Permanence:** The Cloud Canonical Store SHALL serve as the permanent repository for all service and financial events for the duration of the shop's operational life or until legally required otherwise.
- **Shadow Profile Expiry:** System-generated Shadow Profiles with zero transaction activity for 24 consecutive months SHALL be flagged for automated PII purging.
- **Device Decommissioning:** Upon terminal replacement or decommissioning, a mandatory "Hardware Wipe" MUST be performed to destroy local encryption keys and database files, rendering all local data unrecoverable.
- **Backhaul Recovery Window:** During prolonged offline periods, the local terminal MUST support data retention for up to 90 days of operational events before requiring a synchronization event to clear local storage pressure.

---

### 13. UX Conceptual Model

Purpose: Outline high-level interaction principles and interface responsibilities for each system persona while preserving operational clarity, partnership autonomy, and offline-first reliability.

#### **13.1 Public Status Board**

- **Passive Transparency Model:** The board SHALL function as the shared operational truth surface of the shop, providing ambient awareness without requiring interactive control or customer authentication.
- **Dual Queue Visualization:** The interface MUST simultaneously represent the Global Queue (arrival fairness) and individual Barber Lanes (preference alignment).
- **Bilingual Status Rendering:** All operational states and headers MUST support a high-legibility toggle between English and Amharic.
- **Cinema Dark Visual Identity:** The UI SHALL utilize a "Cinema Dark" palette consisting of charcoal (#121212) backgrounds with high-contrast gold and white accents for optimal visibility in varied shop lighting.
- **Anonymized Identification:** Customers SHALL be represented by non-PII identifiers (e.g., initials or ticket suffixes) to ensure public privacy.
- **Offline Continuity Signaling:** During connectivity loss, the board MUST continue reflecting local operational truth. A subtle "Local Mode" indicator SHALL appear to inform staff of offline status without triggering customer-facing panic.
- **Expectation Stabilization:** The interface SHALL communicate relative progress (e.g., "Next Up") rather than precise minute-based estimates to account for variable service durations.

**Design Principle:** The board reduces anxiety by making the invisible queue visible.

#### **13.2 Customer Interface**

- **Guest-Native Interaction:** Essential functionality (Check-in, Status Tracking, Payment) MUST be accessible without account creation or login requirements.
- **Bilingual Accessibility:** The interface SHALL provide a persistent English/Amharic toggle for all instructions, service descriptions, and payment prompts.
- **Session Ephemerality:** Customer interaction sessions MUST expire automatically upon service completion or terminal timeout to prevent identity persistence on shared shop devices.
- **Payment Intent Logic:** The interface SHALL present a locked service subtotal while allowing optional payment increases; any amount exceeding the subtotal MUST be explicitly labeled as "Barber Tip."
- **Truth-State Signaling:** The interface MUST clearly distinguish between "Saved to Shop" (Local Commitment) and "Settled" (Cloud Reconciliation) to manage trust during offline operations.
- **Device Optionality:** Customers SHALL have the choice to use their personal mobile devices (via QR) or a shop-provided terminal to participate in the lifecycle.

**Design Principle:** Customers participate in the system without feeling managed by it.

#### **13.3 Barber Interface**

- **Lane Ownership Model:** Each barber interface SHALL act as a "cockpit," restricted to the control of that specific barber's active lane and upcoming assigned customers.
- **State-Driven Lifecycle:** Actions MUST be limited to critical transitions: `Available`, `Engaged`, and `Service Complete`.
- **Crisis UX (State Recovery):** In the event of a device hardware or battery failure, the Barber Interface MUST allow a new terminal to "Hot-Swap" into the lane state upon re-authentication, retrieving the last local-journaled event.
- **Non-Financial Isolation:** Barbers SHALL have visibility into personal tip earnings but MUST NOT access shared business revenue data or peer performance metrics.
- **Interruption Avoidance:** Notifications MUST be restricted to operationally critical events (e.g., specific barber request arrival). Non-essential system alerts SHALL be suppressed during active service.
- **Consent-Based Reassignment:** Any cashier-initiated queue balancing that affects a barber’s lane MUST require an explicit "Acknowledge" action from the barber to proceed.

**Design Principle:** The system adapts to barber workflow—never interrupts craftsmanship.

#### **13.4 Cashier Dashboard**

- **Operational Coordination Layer:** The dashboard SHALL provide a shop-wide health view including queue congestion, active payment sessions, and terminal synchronization status.
- **Payment Oversight & Crisis Handling:** The interface MUST handle partial payment timeouts or digital gateway failures by allowing a manual fallback to "Cash Settlement" without losing the original transaction metadata.
- **Assisted Routing Controls:** Cashiers MAY initiate queue reassignments only upon load imbalance; however, the UI MUST display the agreement status of both barber and customer before finalizing the move.
- **Offline Independence:** All cashier operations, including transaction confirmation and lane monitoring, MUST remain fully functional without cloud connectivity.
- **Sync Health Monitoring:** The dashboard MUST provide a detailed "Sync Pulse" indicator, showing the count of locally queued events vs. cloud-reconciled events.
- **Minimal Financial Exposure:** Operational access SHALL be restricted to transaction verification; full audit-level financial reporting is reserved for the Admin Control Panel.

**Design Principle:** The cashier stabilizes operations without controlling them.

#### **13.5 Admin Control Panel**

- **Governance Authority:** Admins SHALL maintain exclusive control over the Fixed-Price Registry, Barber Roster configurations, and operational shop hours.
- **Immutable Audit Visibility:** The interface MUST provide a non-editable view of financial logs and a complete synchronization audit trail for all shop terminals.
- **Non-Destructive Correction:** Any administrative correction or refund SHALL be recorded as a new "Adjustment Event" linked to the original UUID rather than modifying historical data.
- **Risk & Threshold Surfacing:** The panel MUST highlight operational anomalies, such as prolonged offline states (>4 hours), reconciliation conflicts, or repeated digital payment failures.
- **Delayed Influence Model:** Configuration updates (e.g., price changes) SHALL apply prospectively; the UI MUST NOT allow changes to interfere with active service sessions currently in the `Engaged` or `Payment Pending` states.
- **Terminal Health Awareness:** Admins SHALL have visibility into the battery status, storage health, and software versioning of all active shop-owned devices.

**Design Principle:** Admins govern rules; they do not rewrite history.

---

### 14. Metrics & Success Criteria

Purpose: Define quantitative indicators of product health through measurable observation and telemetry.

#### **14.1 Operational Metrics**

- **Mean Synchronization Latency:** The system SHALL measure the time delta between local event journal commitment and cloud canonical acknowledgment; the target threshold is < 120 seconds across a rolling 24-hour window during periods of active internet backhaul.
- **Local Operational Availability:** The system SHALL track the uptime percentage of core local functions (check-in, queue entry, and payment recording) across a rolling 7-day window; the target KPI is ≥ 99.9% availability during power-on hours, regardless of ISP status.
- **Local Write Performance:** The system SHALL measure the latency of ACID-compliant writes to the local journal per 1,000 events; the target performance success band is a P95 latency of < 50ms.
- **State Reconstitution Duration:** The system SHALL measure the time required to replay un-synced events and restore the active lane state upon reboot or failure recovery; the target success threshold is < 10 seconds per recovery event.
- **Event Journal Integrity:** The system SHALL monitor the ratio of malformed or unrecoverable local event logs per 10,000 journal entries; the target failure rate is 0.0% over the life of the terminal.

#### **14.2 Financial Accuracy Metrics**

- **Reconciliation Parity:** The system SHALL perform a sum-parity check between local terminal ledgers and cloud canonical records per synchronization batch; the target KPI is 100% parity with zero unresolved discrepancies over a rolling 30-day window.
- **Digital Settlement Response Time:** The system SHALL measure the interval from QR intent generation to verified gateway webhook confirmation; the target mean duration is < 15 seconds across all successful digital transactions on a rolling 24-hour basis.
- **Idempotency Success Rate:** The system SHALL monitor the occurrence of duplicate `transaction_uuid` commitments to the cloud ledger per 10,000 events; the target success threshold is zero duplicates.
- **Itemization Consistency:** The system SHALL observe the ratio of successfully partitioned transactions (Service Revenue vs. Barber Tip) against the fixed-price registry per daily close; the target threshold is target ≥ 99.99% with anomaly alerting for deviations.
- **Audit Attribution Coverage:** The system SHALL track the percentage of financial and operational events containing valid `Actor_ID`, `Terminal_ID`, and `Sequence_Counter` metadata, with a target ≥ 99.99% with anomaly alerting for deviations.

#### **14.3 Customer Experience Metrics**

- **Wait Time Accuracy:** The system SHALL observe the variance between the estimated wait position at check-in and the actual transition to `Engaged` per service event; the target success band is a mean deviation of < 20% on a rolling 7-day average.
- **Queue Retention Ratio:** The system SHALL calculate the ratio of `Waiting` customers transitioning to `Cancelled` or `Expired` states per 100 entries; the target retention threshold is > 90% across a rolling 7-day window.
- **Settlement Throughput:** The system SHALL measure the duration of the `Payment_Pending` state across a rolling 24-hour window; the target mean duration is < 180 seconds from service completion to successful settlement.
- **Feedback Conversion Rate:** The system SHALL measure the percentage of unique `Settled` transactions that result in a submitted quality score within the 48-hour eligibility window, evaluated monthly.

#### **14.4 Adoption Indicators**

- **Operator Protocol Adherence:** The system SHALL measure the ratio of barber-initiated state changes (Available/Engaged/Complete) against the total service volume per shift; the target adherence threshold is ≥ 95%.
- **Identity Promotion Velocity:** The system SHALL monitor the monthly ratio of `Shadow Profiles` converted to `Verified Accounts` via OTP verification to assess customer-side platform trust.
- **Offline Resilience Utilization:** The system SHALL track the percentage of service events finalized while in an offline state relative to total shop volume; evaluated monthly to validate local-first operational trust.
- **Loyalty Engagement Frequency:** The system SHALL measure the count of `Recognition_Unit` triggers generated per 100 client visits; evaluated over a rolling 30-day window.
- **Inter-Terminal Sync Latency:** The system SHALL measure the time required for state propagation from a local terminal to the Public Status Board via the local area network (LAN); the target P99 latency is < 2 seconds.

---

### 15. Future Expansion Considerations

Purpose: Identify long-term roadmap possibilities and platform evolution while preserving system invariants and operational philosophy.

#### **15.1 Multi-Branch Support**

- **Branch-Level Sovereignty:** Each physical location SHALL maintain its own local terminal and authoritative event journal. A failure or network outage at Branch A MUST NOT impact the operational continuity of Branch B.
- **Distributed Ledger Reconciliation:** Branch-specific financial events SHALL be synchronized to a global canonical ledger. Cross-branch revenue reporting MUST be aggregated at the cloud level while preserving the itemized integrity of local transactions.
- **Global Identity Continuity:** The system SHALL support cross-branch UUID resolution, allowing a "Shadow Profile" or "Verified Account" created at one location to be recognized and retrieved at any other location within the network upon check-in.
- **Partial Synchronization:** Terminals SHOULD implement "Lazy Loading" for non-local customer profiles to minimize local storage pressure while ensuring that active service history remains portable.
- **Operational Isolation:** Queue states and barber availability MUST remain strictly local to the physical branch; the system SHALL NOT allow remote queue entry across branch boundaries in Phase 2.
- **Failure Containment:** Synchronization anomalies or ledger inconsistencies originating from one branch MUST NOT propagate operational disruption to other branches; reconciliation SHALL occur at the cloud aggregation layer only.

#### **15.2 Marketplace Possibilities**

- **Identity and Reputation Portability:** The platform MAY evolve to allow independent barbers or partner studios to join the ecosystem. A barber’s "Verified Service Feedback" and "Recognition Units" SHALL be linked to their immutable UUID, ensuring professional reputation persists across different host locations.
- **Decentralized Participation:** The marketplace model MUST adhere to the shared partnership philosophy; the platform SHALL NOT transition into an extraction-based "gig economy" model. Participation rules MUST be transparent and baked into the protocol-enforced ledger rules.
- **Fairness Safeguards:** Independent participants MUST operate under the same deterministic queue engine and financial itemization rules as internal partners to ensure customer experience parity.
- **Protocol-Level Integration:** External studios using the Hub infrastructure SHALL be treated as distinct "Branch Entities" with their own local sovereignty but shared access to the global identity and reputation layer.

#### **15.3 AI Scheduling Opportunities**

- **Non-Authoritative Advisory Layer:** Any AI-driven scheduling features SHALL function exclusively as an advisory layer. The AI MAY suggest "Demand Shaping" strategies (e.g., prompting "Regulars" to visit during predicted low-velocity windows) but MUST NOT have the authority to reorder the Global Queue or override human cashier decisions.
- **Wait-Time Prediction:** The system MAY utilize machine learning to analyze historical event data to provide higher-accuracy "Estimated Wait" signals; however, these SHALL remain non-binding and secondary to the deterministic "Position in Queue" display.
- **Staffing Recommendations:** AI modules SHOULD surface staffing level suggestions to Admins based on historical demand patterns, facilitating optimized barber utilization without interrupting active craftsmanship.
- **Deterministic Boundaries:** AI-generated recommendations MUST be clearly flagged in the UI. A human operator (Cashier/Admin) SHALL maintain the exclusive right to "Accept" or "Ignore" AI suggestions. The core Queue Engine logic MUST remain deterministic and code-auditable.
- **Recommendation Auditability:** All AI-generated recommendations SHALL be recorded as advisory events in the journal to allow retrospective evaluation without influencing deterministic system state.

#### **15.4 Platform Extensions**

- **Event-Hook Architecture:** Future extensions (e.g., retail modules, coffee service, or grooming product sales) MUST operate through the existing append-only ledger model. Each new service type SHALL be represented as a distinct itemized event within a single `transaction_uuid`.
- **Sandbox Safety Constraints:** External analytics or plugin modules MUST NOT have write-access to the core Queue Engine or the Financial Ledger. Extensions SHALL interact with the system via a read-only local API or by appending non-critical "Extension Events" to the journal.
- **Unified Settlement:** All extensions MUST settle through the established Payment Intent Model. The system SHALL maintain the logic that `Total_Paid = Sum(Itemized_Components)`, ensuring that add-on services do not destabilize the core revenue/tip split logic.
- **Modular Analytics:** Advanced reporting modules MAY be introduced as cloud-side extensions, processing synchronized event logs without adding computational overhead to the local shop terminals.
- **Operational Isolation:** Extensions MUST execute outside the critical operational path and SHALL NOT introduce latency into queue transitions or payment processing workflows.
