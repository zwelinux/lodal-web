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
          <b>Your account:</b> your email address, which Google (or Apple, in the iPhone app) gives us when you choose Continue with Google or Continue with Apple. If you hide your email in
          Apple, we get the private address Apple makes for us. We never see or store your Google or Apple password.
        </li>
        <li>
          <b>What you write:</b> your subjects, tasks, projects, project tickets, notes and the pictures you add to them, who a ticket is assigned to, and the dates and done marks on them.
        </li>
        <li>
          <b>Invitations:</b> if you invite someone to a project, we keep the email address you typed so the invitation link works for that person only.
        </li>
        <li>
          <b>Technical records:</b> our server keeps ordinary logs (such as your IP address and the time of a request) to keep the service secure and to fix
          problems. Your phone or browser keeps a login token so you stay signed in.
        </li>
      </ul>

      <h2>Google Drive, Google Calendar and the browser extension</h2>
      <p>
        Lodal keeps your files in your own Google account, so after you sign up it asks you to connect Google Drive and Google Calendar. Nothing below happens until you connect, and
        you can disconnect any time (you will be asked to connect again the next time you open Lodal).
      </p>
      <ul>
        <li>
          <b>Google Drive:</b> if you connect it, Lodal makes a folder called Lodal in <i>your</i> Drive. It keeps a copy of each of your notes there as a text file, and the
          pictures you add, using the same names as in Lodal. The pictures and files you send in a chat are kept there too (in Lodal/Chat files), in the Drive of the person who sent them, and the
          other people in that chat can open them through Lodal. If the sender deletes the message, or disconnects Drive, the file is removed or no longer opens. Lodal asks Google for the narrow &quot;drive.file&quot; permission, so it can only see and change the files it
          made itself, never the rest of your Drive. When you disconnect, your pictures are copied back into Lodal and the note files stay in your Drive.
        </li>
        <li>
          <b>Google Calendar:</b> if you connect it, Lodal makes a separate calendar called Lodal in your Google Calendar and puts your dated tasks and the project tickets
          assigned to you in it, as all-day events. Lodal asks for the narrow &quot;calendar.app.created&quot; permission, so it can only manage the calendar it made, never your
          other calendars or events. Disconnecting removes that calendar. When you press the video button in a chat, Lodal adds an event with a Google Meet link to that calendar and posts the link in the chat. Anyone with the link can ask to join the call.
        </li>
        <li>
          <b>Keeping the connection:</b> to keep Drive or Calendar up to date, Lodal stores a key from Google (a refresh token) for you, encrypted. It is used only for the
          two things above. You can also remove Lodal&apos;s access any time in your Google Account settings.
        </li>
        <li>
          <b>Browser extension:</b> the Lodal extension shows your tasks, lets you add tasks and subjects, and saves a page as a note. It stores a Lodal sign-in key in your browser.
          Only when you press <b>Save to Notes</b> does it read the title, address and any text you selected on the page you are on, and send them to your Lodal notes. It does not read
          pages in the background, does not track your browsing, and sends nothing anywhere except to Lodal.
        </li>
        <li>
          <b>Proof of a note:</b> if you make a dated proof of a note, only a fingerprint of it (a SHA-256 hash, not the text) is sent to the free public OpenTimestamps network,
          which anchors it in Bitcoin.
        </li>
      </ul>
      <p>
        Lodal&apos;s use and transfer of information received from Google APIs follows the{" "}
        <a href="https://developers.google.com/terms/api-services-user-data-policy">Google API Services User Data Policy</a>, including the Limited Use requirements. We do not use
        this data for advertising and we do not sell it.
      </p>

      <h2>Messages you save into a note</h2>
      <p>You can save any chat message into one of your notes. It is copied into the note as text. From then on it is part of the note, with the same sharing as the note.</p>

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
        Lodal uses encrypted connections (HTTPS), keeps no passwords (sign-in is handled by Google or Apple), and limits repeated sign-in attempts. No online service can promise
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
