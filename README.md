# 📅 Calm Calendar

A privacy-first calendar synchronization application that allows users to mirror their availability across multiple Google Calendars by syncing **Busy Blocks** instead of copying event details. Built using **Next.js**, **TypeScript**, **NextAuth.js**, and the **Google Calendar API**, the application enables seamless schedule synchronization while protecting sensitive information.

---

## 🚀 Features

* 🔐 Secure Google Authentication using OAuth 2.0
* 📆 Fetch all calendars associated with a user's Google account
* 🔄 Synchronize availability between any two calendars
* 🔒 Preserve privacy by syncing only **Busy** blocks instead of event titles or descriptions
* 🚫 Automatically filter out:

  * Birthday events
  * Cancelled events
  * Invalid or incomplete events
* ⚡ Responsive and intuitive user interface
* 🌐 Deployed on Vercel for easy access

---

## 🛠️ Tech Stack

### Frontend

* Next.js (App Router)
* React
* TypeScript
* Tailwind CSS

### Authentication

* NextAuth.js
* Google OAuth 2.0

### APIs

* Google Calendar API

### Deployment

* Vercel

---

# 📂 Project Structure

```text
calm-calendar/
│
├── app/
│   ├── api/
│   │   ├── auth/
│   │   └── sync/
│   ├── dashboard/
│   └── page.tsx
│
├── components/
│
├── lib/
│
├── types/
│
├── public/
│
├── .env.local
├── package.json
└── README.md
```

---

# 🏗️ System Architecture

```text
             Google Login
                    │
                    ▼
            NextAuth Authentication
                    │
                    ▼
            Google OAuth Access Token
                    │
                    ▼
          Google Calendar API
                    │
        ┌───────────┴───────────┐
        ▼                       ▼
 Read Source Calendar     Read Target Calendar
        │
        ▼
   Filter Events
        │
        ▼
 Generate Busy Blocks
        │
        ▼
Insert Busy Events into Target Calendar
```

---

# 🔄 Synchronization Workflow

The application follows the workflow below:

1. User signs in with Google.
2. Available calendars are fetched from Google Calendar.
3. User selects:

   * Source Calendar
   * Target Calendar
4. Events from the source calendar are retrieved.
5. Unwanted events are filtered.
6. Remaining events are converted into **Busy Blocks**.
7. Busy blocks are inserted into the target calendar.

---

# 🧠 Core Algorithm

```text
Fetch Source Events
        │
        ▼
Ignore Birthday Events
        │
        ▼
Ignore Cancelled Events
        │
        ▼
Extract Start & End Time
        │
        ▼
Create Busy Event
        │
        ▼
Insert into Target Calendar
```

Time Complexity:

| Operation            | Complexity |
| -------------------- | ---------- |
| Fetch Events         | O(n)       |
| Filter Events        | O(n)       |
| Generate Busy Blocks | O(n)       |
| Insert Events        | O(n)       |

Overall Complexity:

```text
O(n)
```

where **n** is the number of calendar events.

---

# 🔐 Authentication

Authentication is handled using **NextAuth.js** with Google OAuth.

The authentication flow:

```text
User
 │
 ▼
Google Login
 │
 ▼
NextAuth
 │
 ▼
JWT Callback
 │
 ▼
Session Callback
 │
 ▼
Access Token
 │
 ▼
Google Calendar API
```

The Google access token is securely stored in the user's session and used for authorized Calendar API requests.

---

# 📅 Google Calendar API

The project uses the following Google Calendar API operations:

| API           | Purpose                               |
| ------------- | ------------------------------------- |
| Calendar List | Fetch user's calendars                |
| Events List   | Retrieve events from source calendar  |
| Events Insert | Create busy blocks in target calendar |

---

# 🔒 Privacy

Instead of copying actual event information such as:

```text
Interview with ABC Company
```

or

```text
Doctor Appointment
```

the application creates:

```text
Busy
```

This ensures that only **availability** is shared while event details remain private.

---

# 🚫 Event Filtering

The synchronization process automatically ignores:

* Birthday events
* Cancelled events
* Empty events
* Events with missing timestamps

This prevents unnecessary or invalid events from being copied.

---

# ⚙️ Installation

Clone the repository:

```bash
git clone https://github.com/<your-username>/<your-repository>.git
```

Move into the project directory:

```bash
cd <your-repository>
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

---

# 🔑 Environment Variables

Create a `.env.local` file in the project root.

```env
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
NEXTAUTH_SECRET=your_secret
NEXTAUTH_URL=http://localhost:3000
```

---

# 💡 Future Improvements

* Merge overlapping busy intervals before synchronization.
* Incremental synchronization to reduce API usage.
* Duplicate detection using event metadata.
* Support recurring event synchronization.
* Automatic background syncing.
* Multi-account support.
* Sync analytics and activity logs.
* Conflict detection and resolution.
* Configurable synchronization rules.

---

# 📈 Challenges Faced

* Securely handling Google OAuth authentication.
* Managing Google Calendar API permissions.
* Preserving user privacy while synchronizing calendars.
* Handling invalid or cancelled events.
* Managing deployment environment variables on Vercel.
* Building a responsive and intuitive user interface.

---

# 🎯 Learning Outcomes

This project strengthened my understanding of:

* OAuth 2.0 authentication
* NextAuth.js session management
* Google Calendar API integration
* REST API consumption
* TypeScript in production applications
* Secure token handling
* React state management
* Next.js App Router
* Privacy-focused software design
* Deploying full-stack applications on Vercel

---

# 🤝 Contributing

Contributions, bug reports, and feature requests are welcome.

1. Fork the repository.
2. Create a new feature branch.
3. Commit your changes.
4. Push to your branch.
5. Open a Pull Request.

---

# 📄 License

This project is licensed under the MIT License.

---

# 👨‍💻 Author

**Aaditya Aggarwal**

If you found this project useful, consider giving the repository a ⭐.
