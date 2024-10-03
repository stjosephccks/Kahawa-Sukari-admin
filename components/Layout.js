import Nav from "@/components/Nav";
import { useSession, signIn, getSession } from "next-auth/react";
import { useState, useEffect } from "react";
import Logo from "./Logo";
import { useRouter } from "next/router";

export default function Layout({ children }) {
  const [showNav, setShowNav] = useState(false);
  const { data: session, status } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    console.log("Login form submitted");
    setErrorMessage("");

    const res = await signIn("credentials", {
      redirect: false,
      email,
      password,
    });

    console.log("Sign-in response:", res);

    if (res.ok) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const session = await getSession();
      console.log("Current session after login:", session);
    } else {
      setErrorMessage(res.error || "Failed to login");
    }
  };

  useEffect(() => {
    if (status === "loading") return;
    if (session) {
      console.log("User is logged in:", session);
    } else {
      console.log("No user session found.");
    }
  }, [session, status]);

  if (status === "loading") {
    return <div>Loading...</div>;
  }

  if (!session) {
    return (
      <div className="bg-bgGray w-screen h-screen flex items-center justify-center">
        <div className="text-center w-full max-w-xs">
          <Logo />
          <form className="bg-white p-4 rounded-lg shadow-md">
            <h2 className="text-2xl mb-4">Login</h2>

            {errorMessage && (
              <p className="text-red-500 mb-2">{errorMessage}</p>
            )}

            <div className="mb-4">
              <label htmlFor="email" className="block text-left text-sm">
                Email
              </label>
              <input
                type="email"
                id="email"
                className="w-full p-2 border rounded-lg"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="mb-4">
              <label htmlFor="password" className="block text-left text-sm">
                Password
              </label>
              <input
                type="password"
                id="password"
                className="w-full p-2 border rounded-lg"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="bg-blue-500 w-full text-white p-2 rounded-lg"
              onClick={handleLogin}
            >
              Login
            </button>

            <div className="mt-4">
              <button
                type="button"
                onClick={() => signIn("google")}
                className="bg-blue-200 p-2 rounded-lg px-4 w-full"
              >
                Login with Google
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Render layout for logged-in users
  return (
    <div className="bg-bgGray-200 min-h-screen">
      <div className="flex items-center p-4 md:hidden">
        <button onClick={() => setShowNav(true)}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-6 h-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
            />
          </svg>
        </button>
        <div className="flex grow justify-center mr-6">
          <Logo />
        </div>
      </div>
      <div className="flex">
        <Nav show={showNav} />
        <div className="flex-grow p-4">{children}</div>
      </div>
    </div>
  );
}
