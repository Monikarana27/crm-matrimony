"use client";
import { Field, TextAreaField, DobField } from "./field";
import { SearchableSelectField } from "./searchable-select-field";
import { ReferenceSelect } from "./reference-select";
import { getMotherTongues, getOrCreateMotherTongueAction } from "@/actions/master-data/master-data.actions";
import { MARITAL_STATUS_OPTIONS, HEIGHT_OPTIONS } from "@/lib/constants/profile-options";

const GENDER_OPTIONS = ["MALE", "FEMALE", "OTHER"];
const BODY_TYPE_OPTIONS = ["Slim", "Athletic", "Average", "Heavy"];
const COMPLEXION_OPTIONS = ["Fair", "Wheatish", "Dusky", "Dark"];
const BLOOD_GROUP_OPTIONS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const HEALTH_STATUS_OPTIONS = ["Normal", "Physically Challenged", "Other"];

export function BasicInfoTab({ defaultValues }: { defaultValues: Record<string, any> }) {
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
      <Field name="name" label="Name" defaultValue={defaultValues.name} required />
      <SearchableSelectField
        name="gender"
        label="Gender"
        options={GENDER_OPTIONS}
        defaultValue={defaultValues.gender}
        allowCustom={false}
      />
      <DobField
        name="dob"
        label="Date of Birth"
        defaultValue={
          defaultValues.dob
            ? new Date(defaultValues.dob).toISOString().slice(0, 10)
            : ""
        }
      />
      <SearchableSelectField
        name="maritalStatus"
        label="Marital Status"
        options={MARITAL_STATUS_OPTIONS}
        defaultValue={defaultValues.maritalStatus}
      />
      <SearchableSelectField
        name="height"
        label="Height"
        options={HEIGHT_OPTIONS}
        defaultValue={defaultValues.height}
      />
      <Field
        name="weightKg"
        label="Weight (kg)"
        type="number"
        defaultValue={defaultValues.weightKg}
      />
      <ReferenceSelect
        name="motherTongueId"
        label="Mother Tongue"
        defaultValue={defaultValues.motherTongueId}
        fetchOptions={() => getMotherTongues()}
        onCreateOption={(name) => getOrCreateMotherTongueAction(name)}
      />
      <SearchableSelectField
        name="bodyType"
        label="Body Type"
        options={BODY_TYPE_OPTIONS}
        defaultValue={defaultValues.bodyType}
      />
      <SearchableSelectField
        name="complexion"
        label="Complexion"
        options={COMPLEXION_OPTIONS}
        defaultValue={defaultValues.complexion}
      />
      <SearchableSelectField
        name="bloodGroup"
        label="Blood Group"
        options={BLOOD_GROUP_OPTIONS}
        defaultValue={defaultValues.bloodGroup}
      />
      <SearchableSelectField
        name="healthStatus"
        label="Health Status"
        options={HEALTH_STATUS_OPTIONS}
        defaultValue={defaultValues.healthStatus}
      />
      <Field name="nativePlace" label="Native Place" defaultValue={defaultValues.nativePlace} />
      <TextAreaField
        name="aboutYourself"
        label="About Yourself"
        defaultValue={defaultValues.aboutYourself}
      />
    </div>
  );
}
