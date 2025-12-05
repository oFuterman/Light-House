"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth";
import { api, SlugSuggestion, SlugCheckResponse } from "@/lib/api";

type Step = "account" | "slug";

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

  // Fetch slug suggestions when moving to step 2
  const fetchSlugSuggestions = useCallback(async () => {
    setLoadingSuggestions(true);
    setError("");

    try {
      const response = await api.suggestSlug(orgName);
      setPrimarySlug(response.primary);
      setAlternatives(response.alternatives);

      // Auto-select the primary slug if available, otherwise first available alternative
      if (response.primary.available) {
        setSelectedSlug(response.primary.slug);
      } else {
        const firstAvailable = response.alternatives.find(a => a.available);
        if (firstAvailable) {
          setSelectedSlug(firstAvailable.slug);
        } else {
          // No available suggestions - user must enter custom
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

  // Handle step 1 submission (account details)
  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Basic validation
    if (!email || !password || !orgName) {
      setError("All fields are required");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    // Move to slug selection step
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

    // If using custom slug, validate it's available
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
            ? "border-gray-900 bg-gray-50 ring-2 ring-gray-900"
            : slug.available
              ? "border-gray-200 hover:border-gray-400"
              : "border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed"
          }
        `}
      >
        <div className="flex items-center justify-between">
          <span className="font-mono text-sm">
            lighthouse.io/org/<span className="font-semibold">{slug.slug}</span>
          </span>
          {slug.available ? (
            <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded">
              Available
            </span>
          ) : (
            <span className="text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded">
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
        <h1 className="text-2xl font-bold mb-2 text-center">Create Account</h1>
        <p className="text-gray-600 text-center mb-6">Step 1 of 2: Account details</p>

        <form onSubmit={handleAccountSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="orgName" className="block text-sm font-medium mb-1">
              Organization Name
            </label>
            <input
              id="orgName"
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="Acme Corp"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              minLength={8}
              required
            />
            <p className="text-xs text-gray-500 mt-1">At least 8 characters</p>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition"
          >
            Continue
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-600">
          Already have an account?{" "}
          <Link href="/login" className="text-gray-900 font-medium hover:underline">
            Login
          </Link>
        </p>
      </div>
    );
  }

  // Step 2: Slug selection
  return (
    <div className="w-full max-w-md">
      <h1 className="text-2xl font-bold mb-2 text-center">Choose Your URL</h1>
      <p className="text-gray-600 text-center mb-6">Step 2 of 2: Pick your organization URL</p>

      <form onSubmit={handleFinalSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">
            {error}
          </div>
        )}

        {loadingSuggestions ? (
          <div className="py-8 text-center text-gray-500">
            Loading suggestions...
          </div>
        ) : (
          <div className="space-y-3">
            {/* Primary suggestion */}
            {primarySlug && renderSlugOption(primarySlug)}

            {/* Alternatives */}
            {alternatives.length > 0 && (
              <>
                <p className="text-xs text-gray-500 pt-2">Alternatives</p>
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
                    ? "border-gray-900 bg-gray-50 ring-2 ring-gray-900"
                    : "border-gray-200 hover:border-gray-400"
                  }
                `}
              >
                <span className="text-sm font-medium">Enter custom URL</span>
              </button>

              {selectedSlug === "custom" && (
                <div className="mt-3">
                  <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-gray-900">
                    <span className="px-3 py-2 bg-gray-100 text-gray-500 text-sm border-r">
                      lighthouse.io/org/
                    </span>
                    <input
                      type="text"
                      value={customSlug}
                      onChange={(e) => setCustomSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                      placeholder="your-slug"
                      className="flex-1 px-3 py-2 text-sm focus:outline-none"
                      autoFocus
                    />
                  </div>

                  {/* Validation feedback */}
                  {customSlug && (
                    <div className="mt-2 text-sm">
                      {isCheckingSlug ? (
                        <span className="text-gray-500">Checking availability...</span>
                      ) : slugCheckResult ? (
                        slugCheckResult.valid && slugCheckResult.available ? (
                          <span className="text-green-600">This URL is available</span>
                        ) : (
                          <span className="text-red-600">{slugCheckResult.error}</span>
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
            className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
          >
            Back
          </button>
          <button
            type="submit"
            disabled={loading || loadingSuggestions}
            className="flex-1 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create Account"}
          </button>
        </div>
      </form>
    </div>
  );
}
