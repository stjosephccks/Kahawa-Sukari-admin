import clientPromise from "@/lib/mongodb";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import NextAuth, { getServerSession } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials"; // Add this import
import bcrypt from "bcryptjs"; // For password encryption
import { AdminEmail } from "@/models/Admin";

let adminEmails = [];

export async function loadAdminEmailsFromDatabase() {
  const client = await clientPromise;
  const db = client.db();
  const adminEmailCollection = db.collection("adminemails"); // Replace 'adminemails' with your MongoDB collection name.
  const adminEmailDocuments = await adminEmailCollection.find({}).toArray();
  adminEmails = adminEmailDocuments.map((document) => document.email);
}

loadAdminEmailsFromDatabase();

export const authOptions = {
  session: {
    strategy: "jwt",
  },
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_ID,
      clientSecret: process.env.GOOGLE_SECRET,
    }),
    CredentialsProvider({
      name: "Email and Password",
      credentials: {
        email: {
          label: "Email",
          type: "email",
          placeholder: "you@example.com",
        },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const { email, password } = credentials;

        try {
          const client = await clientPromise;
          const db = client.db();

          // Fetch the admin by email
          const admin = await db.collection("adminemails").findOne({ email });
          if (!admin) {
            throw new Error("No user found with this email");
          }

          // Check if the password is valid
          const isValidPassword = await bcrypt.compare(
            password,
            admin.password
          );
          if (!isValidPassword) {
            throw new Error("Invalid password");
          }

          return { id: admin._id, email: admin.email, name: admin.name, role: admin.role || "editor" }; // Return user object
        } catch (error) {
          console.error(error);
          throw new Error("Authentication failed");
        }
      },
    }),
  ],
  adapter: MongoDBAdapter(clientPromise),
  callbacks: {
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub; // This ensures the user id is part of the session
        session.user.email = token.email;
        session.user.name = token.name;
        session.user.role = token.role;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id; // Set the user id in the token
        token.email = user.email;
        token.name = user.name;
        // If role is already on the user object (Credentials login), use it.
        // Otherwise (Google login), look it up from the database.
        if (user.role) {
          token.role = user.role;
        } else {
          try {
            const client = await clientPromise;
            const db = client.db();
            const adminRecord = await db.collection("adminemails").findOne({ email: user.email });
            token.role = adminRecord?.role || null;
          } catch (err) {
            console.error("JWT callback: failed to fetch role", err);
            token.role = null;
          }
        }
      }
      return token;
    },
  },
};

// Log secret availability for debugging
if (process.env.NODE_ENV === 'production') {
  console.log('AUTH_SECRET set:', !!process.env.AUTH_SECRET);
  console.log('NEXTAUTH_SECRET set:', !!process.env.NEXTAUTH_SECRET);
  console.log('Using secret:', process.env.AUTH_SECRET ? 'AUTH_SECRET' : process.env.NEXTAUTH_SECRET ? 'NEXTAUTH_SECRET' : 'NONE - THIS WILL FAIL');
}

export default NextAuth(authOptions);

export async function isAdminRequest(req, res) {
  try {
    const session = await getServerSession(req, res, authOptions);

    if (!session) {
      res.status(401).json({ error: "Not Admin" });
      console.log("Unauthorized user access", session?.user?.email);
      return;
    }
  } catch (error) {
    console.log("Error checking admin status ", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
