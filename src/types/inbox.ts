/**
 * inbox.ts
 *
 * TypeScript types and interfaces for the GLOBAL-ARCADE Discovery Inbox.
 * Integrates directly with the Phase 2A V2 qualification model.
 */

export type LifecycleStatus =
  | 'DISCOVERED'
  | 'INBOX_PENDING'
  | 'NEEDS_CLARIFICATION'
  | 'QUALIFIED'
  | 'STAGED'
  | 'READY_FOR_IMPORT'
  | 'PUBLISHED'
  | 'REJECTED'
  | 'ARCHIVED'
  | 'AUTO_APPROVED'
  | 'NEEDS_OWNER_REVIEW'
  | 'REPAIR_REQUESTED'
  | 'RECHECK_REQUIRED'
  | 'OWNER_ACCEPTED'
  | 'REJECTED_FINAL';

export type TechnicalGateStatus =
  | 'UNREVIEWED'
  | 'PASSED'
  | 'BUILD_REQUIRED'
  | 'INCOMPATIBLE'
  | 'REJECTED';

export type SecurityGateStatus =
  | 'UNREVIEWED'
  | 'PASSED'
  | 'SECURITY_REVIEW'
  | 'NEEDS_MANUAL_REVIEW'
  | 'REJECTED';

export type LegalGateStatus =
  | 'UNREVIEWED'
  | 'CLEARED_COMMERCIAL'
  | 'ATTRIBUTION_REQUIRED'
  | 'LICENSE_PENDING'
  | 'LICENSE_REJECTED'
  | 'RESTRICTED';

export type EditorialGateStatus =
  | 'UNREVIEWED'
  | 'APPROVED'
  | 'CHANGES_REQUESTED'
  | 'REJECTED';

export type RejectionType = 'AUTOMATED_SCREENING' | 'HUMAN_REVIEW' | 'OWNER_FINAL' | null;

export interface ReviewAuditRecord {
  timestamp: string;
  reviewer: string;
  pillar: 'technical' | 'security' | 'legal' | 'editorial' | 'lifecycle';
  action: string;
  previousStatus?: string | null;
  newStatus?: string | null;
  notes: string;
  evidence?: string[];
}

export interface TechnicalGate {
  status: TechnicalGateStatus;
  runtimeType: string;
  mobileReady: boolean;
  deployment: string;
  testedBrowsers?: string[];
  evidence?: string[];
  notes?: string;
  timestamp?: string | null;
  reviewer?: string | null;
}

export interface SecurityFinding {
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  category?: string;
  name?: string;
  description?: string;
  snippet?: string;
}

export interface SecurityGate {
  status: SecurityGateStatus;
  staticScanPassed: boolean;
  previewScanPassed?: boolean | null;
  unauthorizedCallsDetected?: boolean | null;
  findings?: SecurityFinding[];
  evidence?: string[];
  notes?: string;
  timestamp?: string | null;
  reviewer?: string | null;
}

export interface LegalGate {
  status: LegalGateStatus;
  codeLicenseSpdx: string;
  assetLicenseStatus: string;
  commercialRedistributionAllowed?: boolean | null;
  embeddingAllowed?: boolean | null;
  hostingPermission?: string | null;
  monetizationAllowed?: boolean | null;
  attributionRequirements?: string | null;
  provenanceEvidenceUrl?: string | null;
  evidence?: string[];
  notes?: string;
  timestamp?: string | null;
  reviewer?: string | null;
}

export interface EditorialGate {
  status: EditorialGateStatus;
  gameplayScore?: number | null;
  category?: string | null;
  tags?: string[];
  titleAr?: string | null;
  descriptionAr?: string | null;
  instructionsEn?: string | null;
  instructionsAr?: string | null;
  evidence?: string[];
  notes?: string;
  timestamp?: string | null;
  reviewer?: string | null;
}

export interface CandidateQualification {
  technical: TechnicalGate;
  security: SecurityGate;
  legal: LegalGate;
  editorial: EditorialGate;
}

export type EvidenceClassification =
  | 'VERIFIED'
  | 'REPORTED'
  | 'ESTIMATED'
  | 'UNVERIFIED'
  | 'UNKNOWN';

export interface AudienceMetricItem {
  metricType: string;
  originalValue: number | string;
  unit?: string;
  sourceUrl?: string | null;
  sourcePublisher?: string;
  collectionDate?: string;
  evidenceClassification: EvidenceClassification;
  collectionMethod?: string;
  notesAndLimitations?: string;
  isSynthetic?: boolean;
}

export interface DiscoverySourceRecord {
  sourcePlatform: string;
  discoveryUrl: string;
  discoveryDate?: string;
  discoveredBy?: string;
  contextNotes?: string;
}

export interface AudienceIndicators {
  playerCount?: number;
  communityPoints?: number;
  communityComments?: number;
  reviewCount?: number;
  averageRating?: number;
  evidenceSources?: string[];
  notes?: string;
  evidenceConfidenceScore?: number;
  overallEvidenceQuality?: 'HIGH' | 'MEDIUM' | 'LOW' | 'NEGLIGIBLE' | 'UNKNOWN';
  metrics?: AudienceMetricItem[];
}

export interface CandidateSummary {
  candidateId: string;
  name: string;
  author: string;
  sourcePlatform: string;
  originalRepoUrl: string;
  discoveryUrl?: string;
  playableUrl?: string;
  isMirror?: boolean;
  audienceIndicators?: AudienceIndicators;
  discoverySources?: DiscoverySourceRecord[];
  discoveryDate: string;
  lastUpdateDate?: string;
  lifecycleStatus: LifecycleStatus;
  rejectionType: RejectionType;
  rejectionReason: string | null;
  rejectionDate: string | null;
  totalScore: number;
  technicalStatus: TechnicalGateStatus;
  securityStatus: SecurityGateStatus;
  legalStatus: LegalGateStatus;
  editorialStatus: EditorialGateStatus;
  multiplayerMode?: string;
  sourceType?: string;
  exactCommitHash?: string | null;
  sourceFingerprint?: string | null;
}

export interface CandidateDossier extends CandidateSummary {
  schemaVersion?: string;
  description?: string;
  programmingLanguage?: string;
  gameEngine?: string;
  licenseName?: string;
  licenseUrl?: string;
  assetLicensingStatus?: string;
  dependencies?: string[];
  html5Compatibility?: boolean;
  mobileCompatibility?: boolean;
  buildInstructions?: string;
  securityFindings?: SecurityFinding[];
  qualityEvidence?: string[];
  scores?: {
    popularityScore?: number;
    technicalQualityScore?: number;
    mobileScore?: number;
    maintenanceScore?: number;
    relevanceScore?: number;
    standaloneScore?: number;
    totalScore?: number;
  };
  publicationEligibility?: string;
  reviewerDecision?: string;
  reviewNotes?: string;
  qualification?: CandidateQualification;
  reviewAuditTrail?: ReviewAuditRecord[];
  reviewHistory?: Array<{
    decision: string;
    systemDecision: string;
    timestamp: string;
    source: string;
  }>;
}

export interface InboxMetrics {
  totalCandidates: number;
  byStatus: Record<string, number>;
  bySource: Record<string, number>;
  byLegalStatus: Record<string, number>;
  byTechnicalStatus: Record<string, number>;
  byRejectionType?: Record<string, number>;
}

export interface InboxManifest {
  version: string;
  generatedAt: string;
  sourceDirectory: string;
  metrics: InboxMetrics;
  candidates: CandidateSummary[];
}

export interface InboxFilterState {
  searchQuery: string;
  sourcePlatform: string;
  lifecycleStatus: string;
  legalStatus: string;
  rejectionType: string;
  sortBy: 'discoveryDate' | 'totalScore' | 'name';
  sortOrder: 'asc' | 'desc';
}
