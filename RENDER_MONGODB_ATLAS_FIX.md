# 🚨 Solving Render & MongoDB Atlas Error: `SSL alert number 80` (`tlsv1 alert internal error`)

When deploying a Node.js backend on **Render** (`blood-bank-management-systemtoday.onrender.com`) connected to **MongoDB Atlas**, you may see the following error in your Render logs:

```text
Failed to connect to MongoDB Atlas: 004D117EDF740000:error:0A000438:SSL routines:ssl3_read_bytes:tlsv1 alert internal error:../deps/openssl/openssl/ssl/record/rec_layer_s3.c:918:SSL alert number 80
```

---

## 🔍 Why Does This Error Occur?

1. **Dynamic Cloud IP Addresses on Render:** Render cloud instances run on dynamic virtual machines whose outbound IP address changes across deploys.
2. **MongoDB Atlas IP Access Whitelist:** By default, MongoDB Atlas blocks **all** incoming TLS connections from unlisted IP addresses. When Render's unwhitelisted IP connects over TLS (`mongodb+srv://...`), Atlas drops the SSL handshake immediately with `SSL alert number 80`.

---

## ✅ How to Fix It (Takes 60 Seconds)

### Step 1: Log into MongoDB Atlas
Open your browser and sign into [https://cloud.mongodb.com/](https://cloud.mongodb.com/).

### Step 2: Open Network Access Settings
In the left navigation sidebar under **Security**, click **Network Access**.

### Step 3: Allow Access From Anywhere (`0.0.0.0/0`)
1. Click the green button **`+ ADD IP ADDRESS`** in the top right.
2. In the modal popup, click **`ALLOW ACCESS FROM ANYWHERE`**.
   - This automatically populates the IP address field with `0.0.0.0/0` (allowing cloud servers like Render, Vercel, and AWS to connect).
3. Click **`Confirm`**.

### Step 4: Wait 1–2 Minutes & Restart Render Service
1. MongoDB Atlas takes roughly 60 seconds to update your cluster firewall rules (status will show *Pending* then *Active*).
2. Once the rule is **Active**, go to your **Render Dashboard** -> click your web service -> click **Manual Deploy** -> **Clear build cache & deploy** (or restart service).
3. Your server logs will now output:
   ```text
   ✅ Connected to MongoDB Atlas successfully.
   ```

---

## 🛠️ Code Improvements Made to `backend/server.js`

We have updated `connectDB()` in `backend/server.js` to:
- Pass explicit MongoDB driver `serverApi: { version: '1', strict: true, deprecationErrors: true }` and timeout options compatible with Render & OpenSSL 3.0.
- Automatically detect `alert number 80` in the logs and print a diagnostic action box directly in your Render deployment console.
