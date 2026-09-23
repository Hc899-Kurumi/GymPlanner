import { firebaseConfig, firebaseConfigured } from "./firebase-config.js";

let createUserWithEmailAndPassword;
let sendPasswordResetEmail;
let signInWithEmailAndPassword;
let signOut;

const authScreen = document.querySelector("#authScreen");
const appShell = document.querySelector("#appShell");
const form = document.querySelector("#authForm");
const emailInput = document.querySelector("#authEmail");
const passwordInput = document.querySelector("#authPassword");
const confirmInput = document.querySelector("#authConfirmPassword");
const confirmField = document.querySelector("#confirmPasswordField");
const submitButton = document.querySelector("#authSubmit");
const resetButton = document.querySelector("#resetPassword");
const message = document.querySelector("#authMessage");
const loginTab = document.querySelector("#loginTab");
const signupTab = document.querySelector("#signupTab");
const setupNotice = document.querySelector("#authSetup");

let mode = "login";
let auth = null;

function setMessage(text = "", success = false) {
  message.textContent = text;
  message.classList.toggle("success", success);
}

function setMode(nextMode) {
  mode = nextMode;
  const signingUp = mode === "signup";
  loginTab.classList.toggle("active", !signingUp);
  signupTab.classList.toggle("active", signingUp);
  loginTab.setAttribute("aria-selected", String(!signingUp));
  signupTab.setAttribute("aria-selected", String(signingUp));
  confirmField.hidden = !signingUp;
  confirmInput.required = signingUp;
  passwordInput.autocomplete = signingUp ? "new-password" : "current-password";
  submitButton.textContent = signingUp ? "Create account" : "Log in";
  resetButton.hidden = signingUp;
  setMessage();
}

function friendlyError(error) {
  const messages = {
    "auth/email-already-in-use": "An account already exists for this email.",
    "auth/invalid-credential": "Incorrect email or password.",
    "auth/invalid-email": "Enter a valid email address.",
    "auth/missing-password": "Enter your password.",
    "auth/network-request-failed": "Network error. Check your connection and try again.",
    "auth/too-many-requests": "Too many attempts. Wait a moment and try again.",
    "auth/weak-password": "Use a password with at least 6 characters."
  };
  return messages[error?.code] || "Account request failed. Please try again.";
}

loginTab.addEventListener("click", () => setMode("login"));
signupTab.addEventListener("click", () => setMode("signup"));

form.addEventListener("submit", async event => {
  event.preventDefault();
  if (!auth) return setMessage("Finish the Firebase setup first.");
  if (mode === "signup" && passwordInput.value !== confirmInput.value) {
    return setMessage("Passwords do not match.");
  }

  submitButton.disabled = true;
  submitButton.textContent = mode === "signup" ? "Creating account…" : "Logging in…";
  setMessage();
  try {
    if (mode === "signup") {
      await createUserWithEmailAndPassword(auth, emailInput.value.trim(), passwordInput.value);
    } else {
      await signInWithEmailAndPassword(auth, emailInput.value.trim(), passwordInput.value);
    }
    form.reset();
  } catch (error) {
    setMessage(friendlyError(error));
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = mode === "signup" ? "Create account" : "Log in";
  }
});

resetButton.addEventListener("click", async () => {
  if (!auth) return setMessage("Finish the Firebase setup first.");
  const email = emailInput.value.trim();
  if (!email) return setMessage("Enter your email address first.");
  try {
    await sendPasswordResetEmail(auth, email);
    setMessage("Password reset email sent.", true);
  } catch (error) {
    setMessage(friendlyError(error));
  }
});

document.querySelector("#logoutButton").addEventListener("click", async () => {
  if (auth) await signOut(auth);
});

if (!firebaseConfigured) {
  setupNotice.hidden = false;
  submitButton.disabled = true;
  setMessage("Add your Firebase configuration to enable accounts.");
} else {
  try {
    const { initializeApp } = await import("https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js");
    const firebaseAuth = await import("https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js");
    ({
      createUserWithEmailAndPassword,
      sendPasswordResetEmail,
      signInWithEmailAndPassword,
      signOut
    } = firebaseAuth);
    const { getAuth, onAuthStateChanged } = firebaseAuth;
    auth = getAuth(initializeApp(firebaseConfig));
    onAuthStateChanged(auth, user => {
      if (user) {
        authScreen.hidden = true;
        appShell.hidden = false;
        document.querySelector("#userEmail").textContent = user.email || "Signed in";
        window.dispatchEvent(new CustomEvent("gymplanner-auth", { detail: { uid: user.uid } }));
      } else {
        appShell.hidden = true;
        authScreen.hidden = false;
        setMode("login");
      }
    });
  } catch (error) {
    setupNotice.hidden = false;
    setMessage("Firebase could not start. Check firebase-config.js.");
    submitButton.disabled = true;
  }
}
