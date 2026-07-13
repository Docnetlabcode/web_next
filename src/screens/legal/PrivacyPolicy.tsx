"use client";
import {
  BookOpen, Database, Settings2, Eye, MessageSquare, BadgeCheck, CreditCard,
  Share2, BarChart3, Bot, Archive, UserX, SlidersHorizontal, Lock, Globe2,
  Stethoscope, Search, Baby, RefreshCcw, Mail,
} from "lucide-react";
import LegalShell, { Bullets, Note } from "@/components/legal/LegalShell";

const H3 = ({ children }) => <h3 className="pt-2 font-display text-[15px] font-extrabold text-ink-900">{children}</h3>;

const SECTIONS = [
  {
    id: "introduction",
    icon: BookOpen,
    title: "Introduction",
    body: (
      <>
        <p>Orovion is a healthcare-focused platform designed to support professional networking, communication, collaboration, education, and knowledge sharing among healthcare professionals, medical students, and general users.</p>
        <p>This Privacy Policy applies to all users of Orovion, including:</p>
        <Bullets items={[
          "Healthcare Professionals",
          "Medical Students",
          "General Users",
          "Visitors interacting with publicly accessible portions of the Platform",
        ]} />
        <p>The collection, use, storage, and disclosure of information through Orovion are governed by this Privacy Policy and applicable laws.</p>
      </>
    ),
  },
  {
    id: "information-we-collect",
    icon: Database,
    title: "Information we collect",
    body: (
      <>
        <H3>2.1 Information you provide</H3>
        <p><strong className="font-semibold text-ink-900">Registration information.</strong> When creating an account, we may collect:</p>
        <Bullets items={[
          "Full name",
          "Phone number",
          "Email address",
          "Gender",
          "Age (General Users)",
          "Specialization (Healthcare Professionals)",
          "Degree or program information (Medical Students)",
        ]} />
        <p><strong className="font-semibold text-ink-900">Profile information.</strong> Depending on your role, you may provide a profile photograph, cover image, professional headline, biography, languages, education details, workplace information, professional interests, research and publication information, certifications, availability preferences, consultation preferences, and skills or areas of expertise.</p>
        <p><strong className="font-semibold text-ink-900">Content you create.</strong> Information may be collected when you create, upload, publish, or share posts, reels, case studies, research summaries, comments, reactions, messages, feedback submissions, support requests, and uploaded files or media.</p>

        <H3>2.2 Professional verification information</H3>
        <p>Healthcare professionals may voluntarily submit information for verification, which may include:</p>
        <Bullets items={[
          "Professional registration details and registration numbers",
          "Qualifications and supporting certificates",
          "Government-issued identity documents",
          "Selfie photographs submitted for identity confirmation",
        ]} />
        <p><strong className="font-semibold text-ink-900">Verification document retention.</strong> Verification documents are collected solely for verification purposes. Following completion of the verification process, verification documents are removed from active verification workflows and are not displayed publicly. Verification status may be publicly displayed through a verified badge where applicable. Medical students and general users are not currently eligible for professional verification badges.</p>

        <H3>2.3 Transaction information</H3>
        <p>When you make payments through Orovion, we may receive transaction-related information including payment status, transaction identifiers, purchase records, subscription information, consultation-related payment information, refund information, and billing history.</p>
        <p>Orovion does not receive or store complete payment authentication credentials such as:</p>
        <Bullets items={[
          "Debit card PINs",
          "Credit card PINs",
          "CVV numbers",
          "UPI PINs",
          "Net banking passwords",
        ]} />

        <H3>2.4 Automatically collected information</H3>
        <p>When using the Platform, certain technical information may be collected automatically, including device type, device identifiers, operating system, browser information, application version, IP address, usage logs, session information, error reports, security logs, and interaction events. This information helps maintain platform performance, reliability, and security.</p>
      </>
    ),
  },
  {
    id: "how-we-use-information",
    icon: Settings2,
    title: "How we use information",
    body: (
      <>
        <p><strong className="font-semibold text-ink-900">Provide services.</strong> Create and manage accounts, authenticate users, display profiles, deliver platform features, enable networking and communication, and support professional verification.</p>
        <p><strong className="font-semibold text-ink-900">Improve platform functionality.</strong> Personalize user experiences, recommend content and connections, improve platform performance, and develop new features.</p>
        <p><strong className="font-semibold text-ink-900">Communications.</strong> Deliver OTP verification, send notifications, security alerts and account updates, and respond to support requests.</p>
        <p><strong className="font-semibold text-ink-900">Security.</strong> Detect abuse, prevent fraud, protect platform integrity, investigate suspicious activity, and enforce platform policies.</p>
        <p><strong className="font-semibold text-ink-900">Legal compliance.</strong> Comply with legal obligations, respond to lawful requests, and protect users and Orovion.</p>
      </>
    ),
  },
  {
    id: "profile-visibility",
    icon: Eye,
    title: "Profile visibility and public information",
    body: (
      <>
        <p>Users can control profile visibility through platform settings.</p>
        <p><strong className="font-semibold text-ink-900">Public profiles</strong> may display your name, profile photo, headline, professional information, public content, and activity visible under platform settings.</p>
        <p><strong className="font-semibold text-ink-900">Private profiles</strong> restrict access according to privacy settings configured by the user. Certain information may remain visible for identification and networking purposes.</p>
      </>
    ),
  },
  {
    id: "communications",
    icon: MessageSquare,
    title: "Communications and networking features",
    body: (
      <>
        <p>Orovion provides features including direct messaging, connection requests, notifications, professional networking interactions, and calling features (where available). We process communication-related information necessary to provide these services.</p>
        <Note>The Platform's final communication security architecture, including message encryption and call encryption standards, remains under review and may be updated in future versions of this Privacy Policy.</Note>
      </>
    ),
  },
  {
    id: "professional-verification",
    icon: BadgeCheck,
    title: "Professional verification",
    body: (
      <>
        <p>Professional verification is available only to eligible healthcare professionals. Verification may require submission of registration information, qualification details, supporting documents, and identity verification information.</p>
        <p>Verification confirms only that information submitted through the verification process has been reviewed according to Orovion procedures. Verification does not constitute:</p>
        <Bullets items={[
          "Medical licensing",
          "Professional accreditation",
          "Endorsement",
          "Clinical competency certification",
          "Employment verification",
        ]} />
        <p>Orovion reserves the right to approve, reject, suspend, revoke, or request additional information during verification reviews.</p>
      </>
    ),
  },
  {
    id: "payments",
    icon: CreditCard,
    title: "Payments and transactions",
    body: (
      <>
        <p>Orovion may offer paid features, subscriptions, professional services, consultation-related transactions, or other paid offerings through the Platform. To facilitate secure payment processing, Orovion uses trusted third-party payment service providers, including Razorpay.</p>
        <p>When you initiate a payment through Orovion, certain information may be shared with payment processors, including your full name, contact information, transaction amount, billing information, payment status, and transaction identifiers. Payment information is processed directly by payment providers according to their own privacy practices, security controls, and legal obligations. Orovion does not store complete payment authentication credentials.</p>
        <p><strong className="font-semibold text-ink-900">Payment security.</strong> We work with payment providers that implement industry-standard security controls. Payment processing remains subject to the practices and policies of the applicable payment provider.</p>
        <p><strong className="font-semibold text-ink-900">Refunds and billing.</strong> Refunds, cancellations, subscription charges, consultation fees, service charges, and billing disputes are governed by applicable payment, billing, and refund policies.</p>
        <p><strong className="font-semibold text-ink-900">Third-party payment providers.</strong> Current payment providers may include Razorpay. Payment providers may change from time to time and updates will be reflected in this Privacy Policy where required.</p>
      </>
    ),
  },
  {
    id: "how-we-share",
    icon: Share2,
    title: "How we share information",
    body: (
      <>
        <p>We do not sell personal information. Information may be shared with:</p>
        <p><strong className="font-semibold text-ink-900">Service providers.</strong> Trusted providers assisting with cloud infrastructure, data storage, authentication, analytics, notifications, security monitoring, customer support, and payment processing.</p>
        <p><strong className="font-semibold text-ink-900">Legal authorities.</strong> Where required by law or where necessary to comply with legal obligations, respond to lawful requests, protect users, protect platform integrity, or investigate misuse.</p>
        <p><strong className="font-semibold text-ink-900">Business transactions.</strong> Information may be transferred during mergers, acquisitions, corporate restructuring, or asset transfers, subject to appropriate safeguards.</p>
      </>
    ),
  },
  {
    id: "analytics",
    icon: BarChart3,
    title: "Analytics and platform improvement",
    body: (
      <p>Orovion may use analytics services and internal monitoring tools to understand platform usage, feature adoption, user engagement, system performance, and product effectiveness. Analytics data helps improve platform quality, reliability, and user experience.</p>
    ),
  },
  {
    id: "artificial-intelligence",
    icon: Bot,
    title: "Artificial intelligence",
    body: (
      <>
        <p>As of the effective date of this Privacy Policy:</p>
        <Bullets items={[
          "Orovion does not use user content to train artificial intelligence models.",
          "Orovion does not use private messages for AI training.",
          "Orovion does not use verification documents for AI training.",
        ]} />
        <p>If this changes in the future, users will be notified through updates to this Privacy Policy.</p>
      </>
    ),
  },
  {
    id: "data-retention",
    icon: Archive,
    title: "Data retention",
    body: (
      <>
        <p>Information is retained only as long as reasonably necessary to:</p>
        <Bullets items={[
          "Provide services",
          "Maintain security",
          "Comply with legal obligations",
          "Resolve disputes",
          "Enforce platform policies",
        ]} />
        <p>Retention periods may vary depending on information type and applicable legal requirements.</p>
      </>
    ),
  },
  {
    id: "account-deletion",
    icon: UserX,
    title: "Account deletion and recovery",
    body: (
      <>
        <p>Users may request account deletion through account settings. Following deletion:</p>
        <Bullets items={[
          "Accounts enter a soft-deleted state.",
          "Access is restricted.",
          "Public visibility is removed where applicable.",
        ]} />
        <p><strong className="font-semibold text-ink-900">Recovery period.</strong> Users may recover their account by signing in using the same credentials within six (6) months.</p>
        <p><strong className="font-semibold text-ink-900">Permanent deletion.</strong> If no recovery occurs during the six-month recovery period, account data may be permanently deleted according to Orovion retention procedures.</p>
      </>
    ),
  },
  {
    id: "your-rights",
    icon: SlidersHorizontal,
    title: "Your rights and choices",
    body: (
      <>
        <p>Subject to applicable laws, users may have the ability to:</p>
        <Bullets items={[
          "Access information",
          "Correct information",
          "Update profile details",
          "Manage privacy settings",
          "Request deletion",
          "Control communication preferences",
        ]} />
        <p>Requests may be subject to identity verification and legal requirements.</p>
      </>
    ),
  },
  {
    id: "security",
    icon: Lock,
    title: "Security",
    body: (
      <>
        <p>Orovion implements technical, administrative, and organizational safeguards designed to protect information. These measures may include:</p>
        <Bullets items={[
          "Secure authentication",
          "Access controls",
          "Encrypted data transmission",
          "Security monitoring",
          "Fraud prevention systems",
          "Verification review controls",
        ]} />
        <p>No security system can guarantee absolute protection against all risks.</p>
      </>
    ),
  },
  {
    id: "cross-border",
    icon: Globe2,
    title: "Cross-border data transfers",
    body: (
      <p>Orovion primarily operates within India. However, some service providers may process information in other jurisdictions. Where such transfers occur, reasonable safeguards will be implemented consistent with applicable legal requirements.</p>
    ),
  },
  {
    id: "healthcare-content",
    icon: Stethoscope,
    title: "Healthcare content and professional responsibility",
    body: (
      <>
        <p>Orovion may support professional discussions, educational content, case studies, research summaries, and healthcare-related knowledge sharing.</p>
        <Note>The Platform's final policy governing patient-related information, clinical images, medical records, case study publication standards, and de-identification requirements is currently under review. Additional requirements may be introduced through Community Guidelines and future policy updates.</Note>
        <p>Users remain solely responsible for complying with all applicable professional, ethical, confidentiality, and legal obligations.</p>
      </>
    ),
  },
  {
    id: "search-visibility",
    icon: Search,
    title: "Search engine visibility",
    body: (
      <Note>Orovion is currently evaluating whether publicly available profiles and content may be indexed by search engines. This section will be updated once a final platform decision is implemented.</Note>
    ),
  },
  {
    id: "childrens-privacy",
    icon: Baby,
    title: "Children's privacy",
    body: (
      <p>Orovion is not intended for individuals under eighteen (18) years of age. We do not knowingly collect personal information from individuals under the minimum age requirement. If we become aware of such collection, appropriate steps may be taken to remove the information.</p>
    ),
  },
  {
    id: "changes",
    icon: RefreshCcw,
    title: "Changes to this Privacy Policy",
    body: (
      <p>Orovion may update this Privacy Policy periodically. Material changes will be communicated through the Platform or other appropriate channels before becoming effective. Continued use of Orovion after changes become effective constitutes acceptance of the updated Privacy Policy.</p>
    ),
  },
  {
    id: "contact",
    icon: Mail,
    title: "Contact information",
    body: (
      <>
        <p>For questions, requests, or concerns regarding this Privacy Policy, please contact:</p>
        <p>
          <strong className="font-semibold text-ink-900">Orovion Support</strong><br />
          Email: <a href="mailto:support@orovion.com" className="font-semibold text-brand-700 hover:underline">support@orovion.com</a> · <a href="mailto:hello@orovion.com" className="font-semibold text-brand-700 hover:underline">hello@orovion.com</a><br />
          Phone: <a href="tel:+918004227370" className="font-semibold text-brand-700 hover:underline">+91 80042 27370</a><br />
          Address: Varanasi, Uttar Pradesh 221010, India
        </p>
      </>
    ),
  },
];

export default function PrivacyPolicy() {
  return (
    <LegalShell
      eyebrow="Legal"
      title="Orovion Privacy Policy"
      updated="Effective date: to be announced"
      intro={
        <>
          <p className="font-display text-lg font-extrabold text-ink-900">Your privacy matters</p>
          <p>Orovion is committed to protecting the privacy, confidentiality, and security of its users. As a healthcare-focused networking and professional collaboration platform, we recognize the importance of handling personal information responsibly and transparently.</p>
          <p>This Privacy Policy explains how Orovion collects, uses, stores, shares, and protects information when you use our website, mobile applications, and related services (collectively, the "Platform").</p>
          <p>By accessing or using Orovion, you acknowledge that you have read and understood this Privacy Policy.</p>
        </>
      }
      sections={SECTIONS}
    />
  );
}
