import User from "../models/User.js";
import { deriveInitials } from "../game/gameState.js";

const getPrimaryEmail = (clerkUser) => {
  const primary = clerkUser.emailAddresses?.find(
    (entry) => entry.id === clerkUser.primaryEmailAddressId
  );

  return primary ?? clerkUser.emailAddresses?.[0] ?? null;
};

const isVerified = (entry) => entry?.verification?.status === "verified";

export const resolveClerkEmail = (clerkUser) => {
  const primaryEmail = getPrimaryEmail(clerkUser);
  const externalEmail = clerkUser.externalAccounts?.find((entry) => entry.emailAddress) ?? null;
  const email = primaryEmail?.emailAddress ?? externalEmail?.emailAddress ?? "";
  const normalizedEmail = email.toLowerCase();

  const matchingEmailAddresses = clerkUser.emailAddresses?.filter(
    (entry) => entry.emailAddress?.toLowerCase() === normalizedEmail
  ) ?? [];
  const matchingExternalAccounts = clerkUser.externalAccounts?.filter(
    (entry) => entry.emailAddress?.toLowerCase() === normalizedEmail
  ) ?? [];

  return {
    email,
    emailVerified:
      Boolean(email) &&
      [...matchingEmailAddresses, ...matchingExternalAccounts].some(isVerified)
  };
};

const buildFullName = (clerkUser, email) => {
  const parts = [clerkUser.firstName, clerkUser.lastName].filter(Boolean);

  if (parts.length) {
    return parts.join(" ");
  }

  if (clerkUser.username) {
    return clerkUser.username;
  }

  return email.split("@")[0] || "Player";
};

export const upsertUserFromClerk = async (clerkUser) => {
  const { email, emailVerified } = resolveClerkEmail(clerkUser);

  if (!email) {
    throw new Error("The signed-in Clerk user does not have an email address.");
  }

  return User.findOneAndUpdate(
    { clerkId: clerkUser.id },
    {
      clerkId: clerkUser.id,
      email,
      emailVerified,
      firstName: clerkUser.firstName ?? "",
      lastName: clerkUser.lastName ?? "",
      fullName: buildFullName(clerkUser, email),
      imageUrl: clerkUser.imageUrl ?? "",
      lastLoginAt: new Date()
    },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
  );
};

export const upsertTestUser = async (clerkId) =>
  User.findOneAndUpdate(
    { clerkId },
    {
      clerkId,
      email: `${clerkId}@test.blackjackacademy.com`,
      emailVerified: true,
      firstName: "Test",
      lastName: clerkId,
      fullName: `Test ${clerkId}`,
      imageUrl: "",
      lastLoginAt: new Date()
    },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
  );

export const mapUserResponse = (user) => ({
  id: user.clerkId,
  name: user.fullName,
  email: user.email,
  initials: deriveInitials(user.fullName),
  emailVerified: user.emailVerified,
  imageUrl: user.imageUrl || undefined
});
