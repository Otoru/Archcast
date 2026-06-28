import { Geist, Geist_Mono, IBM_Plex_Mono, Inter } from "next/font/google";

import { cn } from "@/lib/utils";

export const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const wfBody = Inter({
  variable: "--font-wf-body",
  subsets: ["latin"],
});

export const wfHeading = IBM_Plex_Mono({
  variable: "--font-wf-heading",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const rootFontVariables = cn(
  geistSans.variable,
  geistMono.variable,
  wfBody.variable,
  wfHeading.variable,
);

export const wfFontVariables = cn(wfBody.variable, wfHeading.variable);
