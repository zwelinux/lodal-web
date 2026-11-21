import LegalShell from "@/components/LegalShell";
import { CONTACT_EMAIL, LAST_UPDATED } from "@/lib/legal";

export const metadata = { title: "Terms of use · Lodal" };

export default function Page() {
  return (
    <LegalShell title="Terms of use" updated={LAST_UPDATED}>
      <p>By creating an account or using Lodal you agree to these terms. If you do not agree, please do not use Lodal.</p>

      <h2>Your account</h2>
      <p>
        You need a valid email address. Keep your password private and tell us if you think someone else is using your account. You are responsible for what
        happens under your account.
      </p>

      <h2>What you put in Lodal</h2>
      <p>
        What you write stays yours. You allow Lodal to store it and show it to you and to the people you share a project with, only so the service can work.
        Do not put anything in Lodal that is illegal, that harms or harasses others, or that you do not have the right to share.
      </p>

      <h2>Shared projects</h2>
      <p>
        When you invite someone, they can see and change that project&apos;s tickets. Only the project owner can invite or remove people and delete the project.
        Think before you invite someone, and only invite people who agree to it.
      </p>

      <h2>Acceptable use</h2>
      <p>Do not try to break, overload or gain access to parts of Lodal or other people&apos;s information, and do not use Lodal to send spam. We may limit or close accounts that do.</p>

      <h2>The service</h2>
      <p>
        Lodal is provided &quot;as is&quot;. We work to keep it running and your information safe, but we cannot promise it will always be available or free of mistakes,
        so keep your own copy of anything you cannot afford to lose. We may change, add or remove features. If we add paid plans, we will say so clearly
        before you pay for anything.
      </p>

      <h2>Ending your use</h2>
      <p>
        You can stop at any time and delete your account in the app or on the website. We may suspend or close an account that breaks these terms.
      </p>

      <h2>Changes</h2>
      <p>We may update these terms. If a change matters, we will update the date above and, where we can, tell you in the app. Using Lodal after that means you accept the new terms.</p>

      <h2>Contact</h2>
      <p>
        Questions: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
      </p>
    </LegalShell>
  );
}
