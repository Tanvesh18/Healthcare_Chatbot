import { useEffect, useRef, useState } from "react";
import { FiAlertCircle } from "react-icons/fi";
import { apiJson } from "../api";

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;
const GOOGLE_SCRIPT_SRC = "https://accounts.google.com/gsi/client";

export default function SocialAuth() {
  const buttonRef = useRef(null);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) {
      setMessage("Google sign-in is not configured yet. Add REACT_APP_GOOGLE_CLIENT_ID to enable it.");
      return undefined;
    }

    let isMounted = true;

    const renderGoogleButton = () => {
      if (!isMounted || !buttonRef.current || !window.google?.accounts?.id) {
        return;
      }

      setMessage("");

      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (response) => {
          if (!response.credential) {
            setMessage("Google sign-in did not return a valid credential.");
            return;
          }

          try {
            setIsSubmitting(true);
            setMessage("");

            const data = await apiJson("/api/auth/google", {
              method: "POST",
              body: JSON.stringify({ credential: response.credential })
            });

            localStorage.setItem("token", data.token);
            window.location.assign("/");
          } catch (error) {
            setMessage(error.message || "Google sign-in failed.");
          } finally {
            setIsSubmitting(false);
          }
        }
      });

      buttonRef.current.innerHTML = "";
      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: "outline",
        size: "large",
        width: "320",
        text: "continue_with",
        shape: "pill"
      });
    };

    if (window.google?.accounts?.id) {
      renderGoogleButton();
      return () => {
        isMounted = false;
      };
    }

    setMessage("Google sign-in is loading...");

    let script = document.querySelector(`script[src="${GOOGLE_SCRIPT_SRC}"]`);
    if (!script) {
      script = document.createElement("script");
      script.src = GOOGLE_SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }

    script.addEventListener("load", renderGoogleButton);

    return () => {
      isMounted = false;
      script.removeEventListener("load", renderGoogleButton);
    };
  }, []);

  return (
    <div className="social-auth">
      <div className="auth-divider">
        <span>or continue with</span>
      </div>

      <div className={`google-auth-shell ${isSubmitting ? "is-loading" : ""}`}>
        <div ref={buttonRef} className="google-auth-button" />
      </div>

      {message && (
        <div className="social-auth-note" role="status">
          <FiAlertCircle />
          <span>{message}</span>
        </div>
      )}
    </div>
  );
}
