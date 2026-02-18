"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth";
import { api, RateLimitError, SlugSuggestion, SlugCheckResponse } from "@/lib/api";

type Step = "account" | "slug";

type ValidationStatus = {
    state: "idle" | "checking" | "valid" | "invalid";
    message?: string;
};

function ValidationIcon({ status }: { status: ValidationStatus }) {
    if (status.state === "idle") return null;

    if (status.state === "checking") {
        return (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <svg className="w-4 h-4 animate-spin text-gray-400" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
            </div>
        );
    }

    const isValid = status.state === "valid";

    return (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 group/icon">
            {isValid ? (
                <svg className="w-4 h-4 text-green-500 dark:text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
            ) : (
                <svg className="w-4 h-4 text-red-500 dark:text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
            )}
            {status.message && (
                <div className="absolute right-0 bottom-full mb-2 px-2.5 py-1.5 text-xs rounded-md shadow-lg whitespace-nowrap opacity-0 pointer-events-none group-hover/icon:opacity-100 group-hover/icon:pointer-events-auto transition-opacity bg-gray-900 text-white dark:bg-gray-200 dark:text-gray-900">
                    {status.message}
                    <div className="absolute right-2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900 dark:border-t-gray-200" />
                </div>
            )}
        </div>
    );
}

export function SignupForm() {
    const router = useRouter();
    const { signup } = useAuth();

    // Form state
    const [step, setStep] = useState<Step>("account");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [orgName, setOrgName] = useState("");
    const [selectedSlug, setSelectedSlug] = useState("");
    const [customSlug, setCustomSlug] = useState("");

    // Validation state
    const [nameStatus, setNameStatus] = useState<ValidationStatus>({ state: "idle" });
    const [emailStatus, setEmailStatus] = useState<ValidationStatus>({ state: "idle" });

    // Slug suggestions state
    const [primarySlug, setPrimarySlug] = useState<SlugSuggestion | null>(null);
    const [alternatives, setAlternatives] = useState<SlugSuggestion[]>([]);
    const [slugCheckResult, setSlugCheckResult] = useState<SlugCheckResponse | null>(null);
    const [isCheckingSlug, setIsCheckingSlug] = useState(false);

    // UI state
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  // Debounced slug check for custom input
  useEffect(() => {
    if (!customSlug || selectedSlug !== "custom") {
      setSlugCheckResult(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsCheckingSlug(true);
      try {
        const result = await api.checkSlug(customSlug);
        setSlugCheckResult(result);
      } catch {
        setSlugCheckResult(null);
      } finally {
        setIsCheckingSlug(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [customSlug, selectedSlug]);

  // Debounced org name availability check
  useEffect(() => {
    const trimmed = orgName.trim();
    if (trimmed.length < 2) {
      setNameStatus({ state: "idle" });
      return;
    }

    setNameStatus({ state: "checking" });
    const timer = setTimeout(async () => {
      try {
        const result = await api.checkOrgName(trimmed);
        setNameStatus(result.available
          ? { state: "valid", message: "Name is available" }
          : { state: "invalid", message: "Name already taken" }
        );
      } catch (err) {
        if (err instanceof RateLimitError) {
          setNameStatus({ state: "invalid", message: `Too many requests. Try again in ${err.retryAfter}s` });
        } else {
          setNameStatus({ state: "idle" });
        }
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [orgName]);

  // Debounced email check
  useEffect(() => {
    const trimmed = email.trim();
    if (!trimmed) {
      setEmailStatus({ state: "idle" });
      return;
    }

    // Basic client-side format check before hitting server
    const looksLikeEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
    if (!looksLikeEmail) {
      setEmailStatus({ state: "invalid", message: "Invalid email format" });
      return;
    }

    setEmailStatus({ state: "checking" });
    const timer = setTimeout(async () => {
      try {
        const result = await api.checkEmail(trimmed);
        if (!result.valid) {
          setEmailStatus({ state: "invalid", message: result.error || "Invalid email format" });
        } else if (!result.available) {
          setEmailStatus({ state: "invalid", message: result.error || "Email already registered" });
        } else {
          setEmailStatus({ state: "valid", message: "Email is available" });
        }
      } catch (err) {
        if (err instanceof RateLimitError) {
          setEmailStatus({ state: "invalid", message: `Too many requests. Try again in ${err.retryAfter}s` });
        } else {
          setEmailStatus({ state: "idle" });
        }
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [email]);

  // Fetch slug suggestions when moving to step 2
  const fetchSlugSuggestions = useCallback(async () => {
    setLoadingSuggestions(true);
    setError("");

    try {
      const response = await api.suggestSlug(orgName);
      setPrimarySlug(response.primary);
      setAlternatives(response.alternatives);

      if (response.primary.available) {
        setSelectedSlug(response.primary.slug);
      } else {
        const firstAvailable = response.alternatives.find(a => a.available);
        if (firstAvailable) {
          setSelectedSlug(firstAvailable.slug);
        } else {
          setSelectedSlug("custom");
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load suggestions";
      setError(message);
    } finally {
      setLoadingSuggestions(false);
    }
  }, [orgName]);

  // Continue button disabled when either field is invalid or still checking
  const canContinue =
    orgName.trim().length >= 2 &&
    email.trim().length > 0 &&
    password.length >= 8 &&
    nameStatus.state === "valid" &&
    emailStatus.state === "valid";

  // Handle step 1 submission (account details)
  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password || !orgName) {
      setError("All fields are required");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (nameStatus.state !== "valid") {
      setError("Please use an available organization name");
      return;
    }

    if (emailStatus.state !== "valid") {
      setError("Please use a valid, available email address");
      return;
    }

    setStep("slug");
    await fetchSlugSuggestions();
  };

  // Handle final submission with selected slug
  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const finalSlug = selectedSlug === "custom" ? customSlug : selectedSlug;

    if (!finalSlug) {
      setError("Please select or enter a URL");
      return;
    }

    if (selectedSlug === "custom") {
      if (!slugCheckResult?.valid) {
        setError(slugCheckResult?.error || "Invalid URL format");
        return;
      }
      if (!slugCheckResult?.available) {
        setError("This URL is already taken");
        return;
      }
    }

    setLoading(true);

    try {
      const user = await signup(email, password, orgName, finalSlug);
      router.push(user.org_slug ? `/org/${user.org_slug}/dashboard` : "/dashboard");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create account";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

    // Render slug option
    const renderSlugOption = (slug: SlugSuggestion) => {
        const isSelected = selectedSlug === slug.slug;

        return (
            <button
                key={slug.slug}
                type="button"
                disabled={!slug.available}
                onClick={() => setSelectedSlug(slug.slug)}
                className={`
                    w-full p-3 text-left border rounded-lg transition
                    ${isSelected
                        ? "border-gray-900 bg-gray-50 ring-2 ring-gray-900 dark:border-gray-300 dark:bg-gray-700 dark:ring-gray-300"
                        : slug.available
                            ? "border-gray-200 hover:border-gray-400 dark:border-gray-600 dark:hover:border-gray-500"
                            : "border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed dark:border-gray-700 dark:bg-gray-800"
                    }
                `}
            >
                <div className="flex items-center justify-between">
                    <span className="font-mono text-sm text-gray-900 dark:text-gray-100">
                        lightesthouse.com/org/<span className="font-semibold">{slug.slug}</span>
                    </span>
                    {slug.available ? (
                        <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded dark:bg-green-900/30 dark:text-green-400">
                            Available
                        </span>
                    ) : (
                        <span className="text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded dark:bg-red-900/30 dark:text-red-400">
                            Taken
                        </span>
                    )}
                </div>
            </button>
        );
    };

    // Step 1: Account details
    if (step === "account") {
        return (
            <div className="w-full max-w-md">
                <h1 className="text-2xl font-bold mb-2 text-center text-gray-900 dark:text-white">Create Account</h1>
                <p className="text-gray-600 text-center mb-6 dark:text-gray-400">Step 1 of 2: Account details</p>

                <form onSubmit={handleAccountSubmit} className="space-y-4">
                    {error && (
                        <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm dark:bg-red-900/30 dark:text-red-400">
                            {error}
                        </div>
                    )}

                    <div>
                        <label htmlFor="orgName" className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-200">
                            Organization Name
                        </label>
                        <div className="relative">
                            <input
                                id="orgName"
                                type="text"
                                value={orgName}
                                onChange={(e) => setOrgName(e.target.value)}
                                placeholder="Acme Corp"
                                className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus:ring-gray-500"
                                required
                            />
                            <ValidationIcon status={nameStatus} />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="email" className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-200">
                            Email
                        </label>
                        <div className="relative">
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus:ring-gray-500"
                                required
                            />
                            <ValidationIcon status={emailStatus} />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="password" className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-200">
                            Password
                        </label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus:ring-gray-500"
                            minLength={8}
                            required
                        />
                        <p className="text-xs text-gray-500 mt-1 dark:text-gray-400">At least 8 characters</p>
                    </div>

                    <button
                        type="submit"
                        disabled={!canContinue}
                        className="w-full py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
                    >
                        Continue
                    </button>
                </form>

                <p className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
                    Already have an account?{" "}
                    <Link href="/login" className="text-gray-900 font-medium hover:underline dark:text-white">
                        Login
                    </Link>
                </p>
            </div>
        );
    }

    // Step 2: Slug selection
    return (
        <div className="w-full max-w-md">
            <h1 className="text-2xl font-bold mb-2 text-center text-gray-900 dark:text-white">Choose Your URL</h1>
            <p className="text-gray-600 text-center mb-6 dark:text-gray-400">Step 2 of 2: Pick your organization URL</p>

            <form onSubmit={handleFinalSubmit} className="space-y-4">
                {error && (
                    <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm dark:bg-red-900/30 dark:text-red-400">
                        {error}
                    </div>
                )}

                {loadingSuggestions ? (
                    <div className="py-8 text-center text-gray-500 dark:text-gray-400">
                        Loading suggestions...
                    </div>
                ) : (
                    <div className="space-y-3">
                        {/* Primary suggestion */}
                        {primarySlug && renderSlugOption(primarySlug)}

                        {/* Alternatives */}
                        {alternatives.length > 0 && (
                            <>
                                <p className="text-xs text-gray-500 pt-2 dark:text-gray-400">Alternatives</p>
                                {alternatives.slice(0, 3).map(renderSlugOption)}
                            </>
                        )}

                        {/* Custom slug option */}
                        <div className="pt-2">
                            <button
                                type="button"
                                onClick={() => setSelectedSlug("custom")}
                                className={`
                                    w-full p-3 text-left border rounded-lg transition
                                    ${selectedSlug === "custom"
                                        ? "border-gray-900 bg-gray-50 ring-2 ring-gray-900 dark:border-gray-300 dark:bg-gray-700 dark:ring-gray-300"
                                        : "border-gray-200 hover:border-gray-400 dark:border-gray-600 dark:hover:border-gray-500"
                                    }
                                `}
                            >
                                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Enter custom URL</span>
                            </button>

                            {selectedSlug === "custom" && (
                                <div className="mt-3">
                                    <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-gray-900 dark:border-gray-600 dark:focus-within:ring-gray-500">
                                        <span className="px-3 py-2 bg-gray-100 text-gray-500 text-sm border-r dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600">
                                            lightesthouse.com/org/
                                        </span>
                                        <input
                                            type="text"
                                            value={customSlug}
                                            onChange={(e) => setCustomSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                                            placeholder="your-slug"
                                            className="flex-1 px-3 py-2 text-sm focus:outline-none dark:bg-gray-800 dark:text-white"
                                            autoFocus
                                        />
                                    </div>

                                    {/* Validation feedback */}
                                    {customSlug && (
                                        <div className="mt-2 text-sm">
                                            {isCheckingSlug ? (
                                                <span className="text-gray-500 dark:text-gray-400">Checking availability...</span>
                                            ) : slugCheckResult ? (
                                                slugCheckResult.valid && slugCheckResult.available ? (
                                                    <span className="text-green-600 dark:text-green-400">This URL is available</span>
                                                ) : (
                                                    <span className="text-red-600 dark:text-red-400">{slugCheckResult.error}</span>
                                                )
                                            ) : null}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <div className="flex gap-3 pt-4">
                    <button
                        type="button"
                        onClick={() => setStep("account")}
                        className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                    >
                        Back
                    </button>
                    <button
                        type="submit"
                        disabled={loading || loadingSuggestions}
                        className="flex-1 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
                    >
                        {loading ? "Creating..." : "Create Account"}
                    </button>
                </div>
            </form>
        </div>
    );
}
