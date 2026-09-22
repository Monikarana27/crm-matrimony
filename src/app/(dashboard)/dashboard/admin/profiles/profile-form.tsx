"use client";

import { useEffect, useRef } from "react";
import { useActionState, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { SourceContactTab } from "./tabs/source-contact-tab";
import { BasicInfoTab } from "./tabs/basic-info-tab";
import { LocationTab } from "./tabs/location-tab";
import { ReligionHoroscopeTab } from "./tabs/religion-horoscope-tab";
import { EducationCareerTab } from "./tabs/education-career-tab";
import { LifestyleTab } from "./tabs/lifestyle-tab";
import { FamilyTab } from "./tabs/family-tab";
import { PartnerPreferenceTab } from "./tabs/partner-preference-tab";
import { PhotosTab } from "@/components/shared/photos-tab";

const BASE_TABS = [
  { id: "source", label: "Source & Contact" },
  { id: "basic", label: "Basic Info" },
  { id: "location", label: "Location" },
  { id: "religion", label: "Religion & Horoscope" },
  { id: "education", label: "Education & Career" },
  { id: "lifestyle", label: "Lifestyle" },
  { id: "family", label: "Family" },
  { id: "partner", label: "Partner Preference" },
] as const;

const PHOTOS_TAB = { id: "photos", label: "Photos" } as const;

type TabId = (typeof BASE_TABS)[number]["id"] | "photos";

interface ProfileFormProps {
  mode: "create" | "edit";
  defaultValues?: Record<string, any>;
  action: (prevState: unknown, formData: FormData) => Promise<{ error: string | null }>;
}

export function ProfileForm({ mode, defaultValues, action }: ProfileFormProps) {
  const [state, formAction, isPending] = useActionState(action, { error: null });
  const [activeTab, setActiveTab] = useState<TabId>("source");

  const dv = defaultValues ?? {};
  const showPhotos = mode === "edit" && !!dv.id;
  const TABS = showPhotos ? [...BASE_TABS, PHOTOS_TAB] : BASE_TABS;

  const currentIndex = TABS.findIndex((t) => t.id === activeTab);
  const isLastTab = currentIndex === TABS.length - 1;
  const isFirstTab = currentIndex === 0;

  function goNext() {
    if (!isLastTab) setActiveTab(TABS[currentIndex + 1].id as TabId);
  }
  function goBack() {
    if (!isFirstTab) setActiveTab(TABS[currentIndex - 1].id as TabId);
  }

  const formRef = useRef<HTMLFormElement>(null);
  const draftKey = `profile-draft-${defaultValues?.id ?? "new"}`;

  useEffect(() => {
    if (!formRef.current) return;
    const saved = localStorage.getItem(draftKey);
    if (!saved) return;
    try {
      const draft: Record<string, string> = JSON.parse(saved);
      const form = formRef.current;
      Object.entries(draft).forEach(([key, value]) => {
        const field = form.elements.namedItem(key);
        if (field && "value" in field) {
          (field as unknown as HTMLInputElement).value = value;
        }
      });
    } catch {
      // ignore corrupt draft
    }
  }, [draftKey]);

  useEffect(() => {
    const form = formRef.current;
    if (!form) return;

    const saveDraft = () => {
      const data = new FormData(form);
      const draft: Record<string, string> = {};
      data.forEach((value, key) => {
        if (typeof value === "string") draft[key] = value;
      });
      localStorage.setItem(draftKey, JSON.stringify(draft));
    };

    const interval = setInterval(saveDraft, 10000);
    form.addEventListener("change", saveDraft);

    return () => {
      clearInterval(interval);
      form.removeEventListener("change", saveDraft);
    };
  }, [draftKey]);

  function validateAndFocus(): boolean {
    const form = formRef.current;
    if (!form) return true;

    const requiredFields = Array.from(form.querySelectorAll<HTMLInputElement>("[required]"));
    const firstInvalid = requiredFields.find((el) => !el.value.trim());

    if (!firstInvalid) return true;

    const tabWrapper = firstInvalid.closest<HTMLElement>("[data-tab]");
    const tabId = tabWrapper?.dataset.tab as TabId | undefined;
    if (tabId) setActiveTab(tabId);

    firstInvalid.classList.add("border-destructive", "ring-2", "ring-destructive");
    const clearHighlight = () => {
      firstInvalid.classList.remove("border-destructive", "ring-2", "ring-destructive");
      firstInvalid.removeEventListener("input", clearHighlight);
    };
    firstInvalid.addEventListener("input", clearHighlight);

    setTimeout(() => firstInvalid.focus(), 50);

    return false;
  }

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <div className="flex flex-wrap gap-2 border-b pb-4">
        {TABS.map((tab, idx) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as TabId)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/70"
            }`}
          >
            {idx + 1}. {tab.label}
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="pt-6">
          <div data-tab="source" className={activeTab === "source" ? "" : "hidden"}>
            <SourceContactTab defaultValues={dv} />
          </div>
          <div data-tab="basic" className={activeTab === "basic" ? "" : "hidden"}>
            <BasicInfoTab defaultValues={dv} />
          </div>
          <div data-tab="location" className={activeTab === "location" ? "" : "hidden"}>
            <LocationTab defaultValues={dv} />
          </div>
          <div data-tab="religion" className={activeTab === "religion" ? "" : "hidden"}>
            <ReligionHoroscopeTab defaultValues={dv} />
          </div>
          <div data-tab="education" className={activeTab === "education" ? "" : "hidden"}>
            <EducationCareerTab defaultValues={dv} />
          </div>
          <div data-tab="lifestyle" className={activeTab === "lifestyle" ? "" : "hidden"}>
            <LifestyleTab defaultValues={dv} />
          </div>
          <div data-tab="family" className={activeTab === "family" ? "" : "hidden"}>
            <FamilyTab defaultValues={dv} />
          </div>
          <div data-tab="partner" className={activeTab === "partner" ? "" : "hidden"}>
            <PartnerPreferenceTab defaultValues={dv} />
          </div>
          {showPhotos && (
            <div data-tab="photos" className={activeTab === "photos" ? "" : "hidden"}>
              <PhotosTab profileId={dv.id} />
            </div>
          )}
        </CardContent>
      </Card>

      {state?.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>
      )}

      <div className="flex items-center justify-between">
        <Button variant="outline" asChild>
          <Link href="/dashboard/admin/profiles">Cancel</Link>
        </Button>

        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={goBack} disabled={isFirstTab}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          {!isLastTab ? (
            <Button type="button" onClick={goNext}>
              Next
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="submit"
              disabled={isPending}
              onClick={(e) => {
                if (!validateAndFocus()) {
                  e.preventDefault();
                }
              }}
            >
              {isPending ? "Saving..." : mode === "create" ? "Create Profile" : "Save Changes"}
            </Button>
          )}
        </div>
      </div>
    </form>
  );
}