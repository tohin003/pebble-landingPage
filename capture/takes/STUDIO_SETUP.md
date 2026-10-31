# Setting up the Studio user for the Pebble film's real takes

About 39 minutes, once. Afterwards you leave the Mac, and the takes record by themselves in the Studio user: the lead
sends the take agent one job at a time and looks at every result.

This list is also at `/Users/Shared/pebble-takes/STUDIO_SETUP.md`, so you can open it from the Studio user too (Finder ›
Go › Go to Folder…, paste `/Users/Shared/pebble-takes`).

**Never type a password, an API key or an e-mail address anywhere except Pebble's own sign-in (step 6) and macOS's own
password boxes. Never into Terminal, a Pebble conversation or Chrome.** In Terminal, type only the two commands on
this page.

---

## 1. In your own account, first (2 minutes)

1. Quit Pebble, Chrome, Comet and any other big app (Xcode, a browser with many tabs). Two users at once is tight on
   memory, and your own Pebble must not run while Studio's does.
2. Plug the Mac in.

## 2. Make the Studio user (3 minutes)

1. Apple menu › **System Settings** › **Users & Groups** › **Add User…** (type your own password when asked).
2. New User: **Standard**. Full Name: **Studio**. Account Name: **studio**. A password you choose (write it nowhere).
   **Create User**.

## 3. Go to the Studio user (4 minutes)

1. Apple menu › **Lock Screen**, then click **Switch User** at the bottom of the screen and choose **Studio**. Never
   **Log Out** of your own account: that would stop the lead's work in it.
2. In the setup screens, choose:
   - Country or Region: **United Kingdom** (24-hour time, °C).
   - Apple Account: **Set Up Later**, then **Skip**. Siri: off. Screen Time: **Set Up Later**. Share analytics: off.
   - Appearance: **Light**.

## 4. Two permissions for Terminal, by hand (2 minutes)

So that nothing asks later, while you are away:
1. Apple menu › **System Settings** › **Privacy & Security** › **Accessibility**: click **+**, type your own
   administrator name and password, choose **Applications › Utilities › Terminal**, and make sure its switch is on.
2. Same page, **Screen & System Audio Recording**: **+**, **Terminal**, switch on.

## 5. The setup command, and the shortcut (7 minutes)

1. Open **Terminal** (Spotlight: ⌘Space, type `Terminal`, Return).
2. Paste this line and press Return:

   ```
   bash /Users/Shared/pebble-takes/agent/setup.sh
   ```

3. It sets the quiet settings, the Dock, the wallpaper and copies the sample files in. Before each macOS question it
   prints which button to click: **Allow** (or **OK**) for "Terminal wants access to control System Events / Music /
   Notes / Calendar / Calculator" and for Calendar's access. When Music opens, close its welcome screen
   (**Continue**), then press Return in Terminal as it asks.
4. When it says **Part 1 is done**, leave Terminal open.
5. Make the shortcut (Shortcuts can't import one without signing it): open **Shortcuts**, click **+**, name it
   **Open day checklist**, add the action **Show Alert** with the text
   `Doors open at 10:00. First wheel taster at 10:30.` and close the window. Then do steps 6 to 10 below.

## 6. Sign Pebble in to its model (3 minutes)

1. Click **Pebble** in the Dock. Allow its notifications when macOS asks.
2. On **Welcome to Pebble**, connect the model you choose: your ChatGPT plan, an API key, or this Mac. Type the
   credential yourself, there only.
3. Pebble › **Settings** › **Models**: the model button should show only the provider's short name. If an e-mail
   address shows anywhere, tell the lead (that screen then stays out of the takes).
4. Sign in to nothing else in this user: no Apple Account, no Google account in Chrome, no YouTube, no Mail.

## 7. Pebble's permissions (7 minutes)

1. Pebble › **Settings** › **Permissions** › **Windows Pebble can use** › **Ask macOS for Accessibility…**; in
   System Settings, turn **Pebble** on.
2. System Settings › Privacy & Security › **Screen & System Audio Recording**: **+**, **Pebble**, switch on. If macOS
   asks to quit and reopen Pebble, choose **Quit & Reopen**.
3. System Settings › **Notifications**: **Pebble**: Allow notifications, style **Banners**. Every other app listed
   there: Allow notifications **off** (in a new user the list is short). **Shortcuts** may stay on.
4. In Pebble, start a new conversation (⌘N) and send this message:

   ```
   List my notes, list this week's events in Calendar, list my shortcuts, pause Music, show the Documents folder in Finder, read Documents/Open day/plan.md, and take a screenshot of my desktop.
   ```

   Pebble asks first on its own cards: click **Allow** (never **Always allow**). macOS then asks once for each app
   ("Pebble wants access to control Notes …", Documents, the screen): click **OK** or **Allow**. If macOS asks
   whether Pebble may "bypass the system private window picker", click **Allow**. You can leave this conversation.

## 8. Chrome with Pebble for Chrome (6 minutes)

1. Open **Google Chrome** from the Dock. Don't sign in to Chrome. Dismiss "Make Chrome your default browser". If it
   asks for a profile name, type **Studio**.
2. In Pebble: **Details** › **Browser** (or type `/browser` in the message box) › **Connect Chrome…** › **Add the
   helper**. Tick **Chrome only**.
3. In Chrome, open `chrome://extensions`, turn on **Developer mode** (top right), click **Load unpacked**, and choose
   Pebble's `browser-extension` folder (Pebble's Browser panel shows its path with a **Copy** button: in the folder
   window press ⌘⇧G and paste). Chrome lists Pebble for Chrome with the ID `ilmkbniehiecgoodnbkkcjgaelebehbj`.
4. Click the puzzle piece in Chrome's toolbar, then **Pebble** › **Pair with Pebble**, and type the 6-digit code that
   Pebble's Browser panel shows (it works once, for two minutes).
5. In the extension's popup, turn on **Let Pebble open its own tabs here**.
6. Chrome's menu **View** › **Always Show Toolbar in Full Screen**: on.
7. Open `youtube.com` once and close its cookie dialog (**Reject all**). Don't sign in. Then quit Chrome (⌘Q).

## 9. Pebble's settings for the takes (2 minutes)

1. Pebble › Settings › **Permissions**: **Ask for approval**. **Screen control**: on. **Take screenshots when a task
   needs them**: on.
2. Settings › **Memory**: on.
3. Settings › **Privacy & Stealth**: **Stealth Lockdown off**.
4. Settings › **General**: notifications for replies and waiting cards: on.
5. System Settings › **Displays**: **Larger Text** (the lead's choice; one setting for every take).

## 10. Never lock, never sleep (2 minutes)

1. System Settings › **Lock Screen**: "Start Screen Saver when inactive": **Never**. "Turn display off on power adapter
   when inactive": **Never**. "Require password after screen saver begins or display is turned off": **Never**.
2. System Settings › **Battery** › **Options…**: "Prevent automatic sleeping on power adapter when the display is off":
   **on**.
3. System Settings › **Control Centre** › **Fast User Switching** › Show in Menu Bar: **Don't Show** (so the account's
   name never shows in the menu bar).

## 11. Start the take agent and leave (1 minute)

1. Click **Terminal** in the Dock and press **Return** in its window.
2. It checks the permissions, then moves the pointer a little and back, so you can see it works, and says
   **Ready**. If it lists something to fix instead, fix that, then paste:

   ```
   bash /Users/Shared/pebble-takes/agent/start.sh
   ```

3. Leave the Mac as it is: on the Studio user's screen, lid open, plugged in. Don't lock it and don't switch users.
   The Terminal window hides itself before each take.

---

## When you come back

- **To stop the agent:** click **Terminal** in the Dock and press **Control-C**. (Or tell the lead "stop": the lead
  can stop it from your account at any time.)
- **To go back to your own account:** Apple menu › **Lock Screen**, **Switch User**, your account, your password.
  Your apps and the lead's work are as you left them.
- **To start the agent again** in the Studio user: Terminal, `bash /Users/Shared/pebble-takes/agent/start.sh`.
- **Keep the Studio user** until the lead says the takes are done. Then (the runbook's cleanup): in Studio, Pebble ›
  Settings › Models › disconnect, and remove Pebble for Chrome; then in your own account, System Settings › Users &
  Groups › Studio › **Delete User…** with **Delete the home folder**.
