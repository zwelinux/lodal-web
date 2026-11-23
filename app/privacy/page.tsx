import LegalShell from "@/components/LegalShell";
import { CONTACT_EMAIL, LAST_UPDATED } from "@/lib/legal";

export const metadata = { title: "Privacy policy · Lodal" };

export default function Page() {
  return (
    <LegalShell title="Privacy policy" updated={LAST_UPDATED}>
      <p>
        Lodal is a planner for your tasks and shared projects. This page explains, in plain words, what information Lodal keeps, why, who can see it, and how
        you can remove it. It covers the Lodal website and the Lodal app for iPhone.
      </p>

      <h2>What we keep</h2>
      <ul>
        <li>
          <b>Your account:</b> your email address, which Google gives us when you choose Continue with Google. We never see or store your Google password.
        </li>
        <li>
          <b>What you write:</b> your subjects, tasks, projects, project tickets, notes, who a ticket is assigned to, and the dates and done marks on them.
        </li>
        <li>
          <b>Invitations:</b> if you invite someone to a project, we keep the email address you typed so the invitation link works for that person only.
        </li>
        <li>
          <b>Technical records:</b> our server keeps ordinary logs (such as your IP address and the time of a request) to keep the service secure and to fix
          problems. Your phone or browser keeps a login token so you stay signed in.
        </li>
      </ul>

      <h2>What we do not do</h2>
      <ul>
        <li>We do not sell your information.</li>
        <li>We do not use advertising trackers or analytics tools in the Lodal app or website today.</li>
        <li>We do not ask for your location, contacts, photos, microphone or camera.</li>
      </ul>

      <h2>Why we use it</h2>
      <p>
        Only to run Lodal: to sign you in, to save and sync your planner between your devices, to let you work on shared projects, to send invitation
        emails you ask for, and to keep the service safe.
      </p>

      <h2>Who can see it</h2>
      <ul>
        <li>
          <b>Only you</b> can see your personal planner.
        </li>
        <li>
          <b>People in a shared project</b> can see that project&apos;s subjects and tickets, and the names and email addresses of the other people in it.
          Tickets assigned to you appear in your own planner.
        </li>
        <li>
          <b>Companies that help us run Lodal</b> handle data on our behalf: our server host (Webdock), our website host (Netlify), and, when we turn them on,
          an email-sending service and a payment provider. We will update this page if that changes.
        </li>
        <li>We may share information if the law requires it.</li>
      </ul>

      <h2>Keeping and deleting your information</h2>
      <p>
        You can delete your account at any time inside the app (menu, then <b>Delete my account</b>) or on the website (menu, then <b>Delete my account</b>).
        This removes your account, your planner and your projects. If you own a project, it is deleted for everyone in it. Tickets you created in someone
        else&apos;s project stay there without your name. Subjects and projects you &quot;delete&quot; while they still contain information are only hidden, so you can bring them
        back, until you delete your account. We may keep backup copies for a limited time after deletion.
      </p>
      <p>
        To ask for a copy of your information, or to have something corrected or removed, email{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>

      <h2>Security</h2>
      <p>
        Lodal uses encrypted connections (HTTPS), keeps no passwords (sign-in is handled by Google), and limits repeated sign-in attempts. No online service can promise
        perfect security, so please keep your Google account secure, ideally with 2-step verification.
      </p>

      <h2>Children</h2>
      <p>Lodal is not meant for children under 13, and we do not knowingly collect their information.</p>

      <h2>Changes</h2>
      <p>If we change this policy in a way that matters, we will update the date above and, where we can, tell you in the app.</p>

      <h2>Contact</h2>
      <p>
        Questions about privacy: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
      </p>
    </LegalShell>
  );
}
