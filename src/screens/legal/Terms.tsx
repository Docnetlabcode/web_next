"use client";
import {
  BookOpen, Building2, UserCheck, Users, KeyRound, BadgeCheck, PenLine,
  ShieldCheck, Stethoscope, MessageSquare, PhoneCall, CreditCard, Copyright,
  Lock, Puzzle, Server, Ban, UserX, AlertCircle, Scale, Handshake,
  RefreshCcw, Landmark, Mail,
} from "lucide-react";
import LegalShell, { Bullets, Note } from "@/components/legal/LegalShell";

const SECTIONS = [
  {
    id: "introduction",
    icon: BookOpen,
    title: "Introduction",
    body: (
      <>
        <p>Welcome to Orovion.</p>
        <p>These Terms of Use ("Terms") govern your access to and use of the Orovion website, mobile applications, and related services (collectively, the "Platform").</p>
        <p>By creating an account, accessing, or using Orovion, you acknowledge that you have read, understood, and agreed to be bound by these Terms. If you do not agree with these Terms, you must not use the Platform.</p>
      </>
    ),
  },
  {
    id: "about-orovion",
    icon: Building2,
    title: "About Orovion",
    body: (
      <>
        <p>Orovion is a healthcare-focused networking, communication, collaboration, and knowledge-sharing platform designed for:</p>
        <Bullets items={["Healthcare Professionals", "Medical Students", "General Users"]} />
        <p>The Platform enables users to:</p>
        <Bullets items={[
          "Create professional profiles",
          "Build networks and connections",
          "Share educational and professional content",
          "Publish posts, reels, case studies, and research content",
          "Participate in discussions",
          "Exchange messages",
          "Access professional opportunities and resources",
        ]} />
        <p>Orovion is not a hospital, clinic, healthcare provider, emergency service, insurance provider, or medical institution.</p>
      </>
    ),
  },
  {
    id: "eligibility",
    icon: UserCheck,
    title: "Eligibility",
    body: (
      <>
        <p>To use Orovion, you must:</p>
        <Bullets items={[
          "Be at least eighteen (18) years of age",
          "Have the legal capacity to enter into binding agreements",
          "Provide accurate registration information",
          "Comply with all applicable laws and regulations",
        ]} />
        <p>By using Orovion, you represent and warrant that you meet these requirements.</p>
      </>
    ),
  },
  {
    id: "user-roles",
    icon: Users,
    title: "User roles",
    body: (
      <>
        <p>Orovion currently supports three user categories:</p>
        <p><strong className="font-semibold text-ink-900">Healthcare Professionals.</strong> Licensed or credentialed healthcare practitioners.</p>
        <p><strong className="font-semibold text-ink-900">Medical Students.</strong> Individuals currently enrolled in recognized healthcare education programs.</p>
        <p><strong className="font-semibold text-ink-900">General Users.</strong> Individuals using the Platform for networking, learning, discussions, or healthcare-related interests.</p>
        <p>Users are responsible for selecting the appropriate role and maintaining accurate profile information.</p>
      </>
    ),
  },
  {
    id: "account-security",
    icon: KeyRound,
    title: "Account registration and security",
    body: (
      <>
        <p>Users may create accounts using approved authentication methods provided by Orovion. You agree to:</p>
        <Bullets items={[
          "Provide accurate information",
          "Keep information updated",
          "Protect your login credentials",
          "Maintain account security",
          "Notify Orovion of unauthorized access",
        ]} />
        <p>You are solely responsible for activities occurring under your account. Orovion reserves the right to suspend or restrict accounts that violate these Terms.</p>
      </>
    ),
  },
  {
    id: "professional-verification",
    icon: BadgeCheck,
    title: "Professional verification",
    body: (
      <>
        <p>Healthcare professionals may apply for professional verification. Verification may require submission of registration details, qualification information, supporting credentials, government-issued identification, and additional documentation requested during review.</p>
        <p>Verification is granted solely at Orovion's discretion. Orovion reserves the right to:</p>
        <Bullets items={[
          "Approve verification",
          "Reject verification",
          "Request additional information",
          "Suspend verification",
          "Revoke verification",
        ]} />
        <p>Verification confirms only that submitted information has been reviewed through Orovion's verification process. Verification does not constitute:</p>
        <Bullets items={[
          "Professional endorsement",
          "Clinical competency certification",
          "Medical licensing",
          "Employment verification",
          "Institutional accreditation",
        ]} />
        <p>Medical Students and General Users are not currently eligible for professional verification badges.</p>
      </>
    ),
  },
  {
    id: "user-content",
    icon: PenLine,
    title: "User content",
    body: (
      <>
        <p>Users may create, upload, publish, and share content through the Platform, including posts, reels, case studies, research summaries, comments, messages, profile information, and documents or media.</p>
        <p>You retain ownership of content you create.</p>
        <p>By publishing content on Orovion, you grant Orovion a worldwide, non-exclusive, royalty-free license to host, display, reproduce, distribute, process, and make such content available solely for operating, maintaining, improving, and promoting the Platform.</p>
      </>
    ),
  },
  {
    id: "content-standards",
    icon: ShieldCheck,
    title: "Content standards",
    body: (
      <>
        <p>You agree not to upload, publish, distribute, or share content that:</p>
        <Bullets items={[
          "Violates any law or regulation",
          "Infringes intellectual property rights",
          "Contains malicious software",
          "Harasses, threatens, or abuses others",
          "Contains hate speech or discriminatory content",
          "Promotes violence",
          "Impersonates another individual or organization",
          "Contains fraudulent or misleading information",
          "Violates privacy rights",
        ]} />
        <p>Orovion reserves the right to remove content that violates these Terms or Community Guidelines.</p>
      </>
    ),
  },
  {
    id: "healthcare-content",
    icon: Stethoscope,
    title: "Healthcare content and professional responsibility",
    body: (
      <>
        <p>The Platform may enable discussion of healthcare, medicine, research, education, and professional topics. Users remain solely responsible for ensuring that content they publish complies with:</p>
        <Bullets items={[
          "Applicable laws",
          "Professional obligations",
          "Ethical obligations",
          "Confidentiality requirements",
          "Regulatory requirements",
        ]} />
        <Note>Orovion's final policy regarding patient information, clinical images, medical records, case study publication requirements, and de-identification standards is currently under review and may be further defined through Community Guidelines and future policies.</Note>
      </>
    ),
  },
  {
    id: "messaging",
    icon: MessageSquare,
    title: "Messaging and communication",
    body: (
      <>
        <p>Orovion provides communication features that may include direct messaging, connection requests, notifications, calling features, and professional networking interactions.</p>
        <p>Users agree not to:</p>
        <Bullets items={[
          "Send spam",
          "Conduct harassment",
          "Circumvent platform restrictions",
          "Use automated messaging systems",
          "Misuse communication features",
        ]} />
        <Note>The Platform's final communication security architecture, including message encryption and call encryption standards, remains under review.</Note>
      </>
    ),
  },
  {
    id: "consultations",
    icon: PhoneCall,
    title: "Calls, consultations, and professional interactions",
    body: (
      <>
        <p>Healthcare professionals may have access to additional communication and consultation-related features. Users are solely responsible for complying with:</p>
        <Bullets items={[
          "Professional obligations",
          "Licensing requirements",
          "Regulatory requirements",
          "Applicable healthcare laws",
        ]} />
        <Note>The Platform's final framework governing paid consultations, professional consultations, patient interactions, and healthcare advice responsibilities remains under review. Future updates may introduce additional requirements or restrictions.</Note>
      </>
    ),
  },
  {
    id: "payments",
    icon: CreditCard,
    title: "Payments, billing, and transactions",
    body: (
      <>
        <p>Orovion may offer paid features, subscriptions, consultation-related transactions, or other paid services. Payments may be processed through third-party payment providers, including Razorpay.</p>
        <p>By making a payment, you agree that:</p>
        <Bullets items={[
          "Payment information may be processed by the payment provider",
          "Applicable taxes and charges may apply",
          "Payment provider terms may apply to transactions",
        ]} />
        <p><strong className="font-semibold text-ink-900">Refunds and billing.</strong> Refund eligibility, cancellations, subscription charges, consultation fees, service charges, and billing disputes are governed by Orovion's applicable payment and refund policies.</p>
        <p>Orovion reserves the right to modify pricing, subscription plans, or paid offerings at any time.</p>
      </>
    ),
  },
  {
    id: "intellectual-property",
    icon: Copyright,
    title: "Intellectual property rights",
    body: (
      <>
        <p>All rights, title, and interest in the Platform, including software, user interfaces, visual assets, branding, logos, trademarks, design systems, and documentation, are owned by Orovion or its licensors.</p>
        <p>You may not copy, reverse engineer, modify, redistribute, resell, or exploit any part of the Platform without prior written authorization.</p>
      </>
    ),
  },
  {
    id: "privacy",
    icon: Lock,
    title: "Privacy",
    body: (
      <p>Your use of Orovion is governed by the <a href="/privacy" className="font-semibold text-brand-700 hover:underline">Orovion&rsquo;s Privacy Policy</a>. The Privacy Policy explains how personal information is collected, used, stored, shared, and protected.</p>
    ),
  },
  {
    id: "third-party-services",
    icon: Puzzle,
    title: "Third-party services",
    body: (
      <>
        <p>Orovion may integrate with third-party providers, including:</p>
        <Bullets items={[
          "Authentication providers",
          "Payment processors",
          "Cloud infrastructure providers",
          "Analytics services",
          "Communication providers",
        ]} />
        <p>Orovion is not responsible for the practices, policies, or actions of third-party services.</p>
      </>
    ),
  },
  {
    id: "platform-availability",
    icon: Server,
    title: "Platform availability",
    body: (
      <>
        <p>Orovion strives to maintain reliable platform availability. However, we do not guarantee:</p>
        <Bullets items={[
          "Continuous operation",
          "Error-free services",
          "Uninterrupted availability",
          "Permanent feature availability",
        ]} />
        <p>The Platform may be modified, suspended, restricted, or discontinued at any time.</p>
      </>
    ),
  },
  {
    id: "suspension-termination",
    icon: Ban,
    title: "Suspension and termination",
    body: (
      <>
        <p>Orovion may suspend, restrict, remove, or terminate access to the Platform where users:</p>
        <Bullets items={[
          "Violate these Terms",
          "Violate Community Guidelines",
          "Engage in fraud",
          "Abuse platform features",
          "Threaten user safety",
          "Threaten platform integrity",
        ]} />
        <p>Orovion may investigate suspected violations and take appropriate action.</p>
      </>
    ),
  },
  {
    id: "account-deletion",
    icon: UserX,
    title: "Account deletion and recovery",
    body: (
      <>
        <p>Users may request account deletion through platform settings. Deleted accounts enter a six (6) month recovery period. During this period:</p>
        <Bullets items={[
          "The account may remain recoverable",
          "Public visibility may be removed",
          "Platform access may be restricted",
        ]} />
        <p>If the user signs in again using the same credentials during this period, the account may be restored. After six (6) months, account data may be permanently deleted according to Orovion's retention procedures.</p>
      </>
    ),
  },
  {
    id: "disclaimers",
    icon: AlertCircle,
    title: "Disclaimers",
    body: (
      <>
        <p>Orovion is provided on an "as is" and "as available" basis. Orovion does not guarantee:</p>
        <Bullets items={[
          "Accuracy of user-generated content",
          "Accuracy of professional claims",
          "Medical accuracy of discussions",
          "Professional outcomes",
          "Employment opportunities",
          "Business opportunities",
          "Networking outcomes",
        ]} />
        <p>Users are responsible for independently evaluating information obtained through the Platform.</p>
      </>
    ),
  },
  {
    id: "limitation-of-liability",
    icon: Scale,
    title: "Limitation of liability",
    body: (
      <>
        <p>To the maximum extent permitted by law, Orovion and its affiliates shall not be liable for:</p>
        <Bullets items={[
          "Indirect damages",
          "Consequential damages",
          "Special damages",
          "Incidental damages",
          "Loss of profits",
          "Loss of revenue",
          "Loss of business opportunities",
          "Loss of data",
        ]} />
        <p>arising from the use of the Platform.</p>
      </>
    ),
  },
  {
    id: "indemnification",
    icon: Handshake,
    title: "Indemnification",
    body: (
      <>
        <p>You agree to defend, indemnify, and hold harmless Orovion, its founders, affiliates, officers, employees, contractors, and representatives from claims, damages, liabilities, costs, and expenses arising from:</p>
        <Bullets items={[
          "Your use of the Platform",
          "Your content",
          "Violations of these Terms",
          "Violations of applicable laws",
          "Violations of third-party rights",
        ]} />
      </>
    ),
  },
  {
    id: "changes",
    icon: RefreshCcw,
    title: "Changes to these Terms",
    body: (
      <p>Orovion may update these Terms from time to time. Material changes will be communicated through the Platform or other appropriate channels before becoming effective. Continued use of the Platform after changes become effective constitutes acceptance of the updated Terms.</p>
    ),
  },
  {
    id: "governing-law",
    icon: Landmark,
    title: "Governing law and jurisdiction",
    body: (
      <p>These Terms shall be governed by and construed in accordance with the laws of India. Any disputes arising from or relating to these Terms shall be subject to the exclusive jurisdiction of the courts located in India (the designated city will be specified in a future update of these Terms).</p>
    ),
  },
  {
    id: "contact",
    icon: Mail,
    title: "Contact information",
    body: (
      <>
        <p>For questions regarding these Terms of Use, please contact:</p>
        <p>
          <strong className="font-semibold text-ink-900">Orovion Support</strong><br />
          Email: <a href="mailto:support@orovion.com" className="font-semibold text-brand-700 hover:underline">support@orovion.com</a><br />
          Phone: <a href="tel:+918004227370" className="font-semibold text-brand-700 hover:underline">+91 80042 27370</a><br />
          Address: Varanasi, Uttar Pradesh 221010, India
        </p>
      </>
    ),
  },
];

export default function Terms() {
  return (
    <LegalShell
      eyebrow="Legal"
      title="Orovion's Terms of Use"
      updated="Effective date: to be announced"
      sections={SECTIONS}
    />
  );
}
