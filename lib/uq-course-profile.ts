import * as cheerio from "cheerio";

const USER_AGENT =
  "Mozilla/5.0 (compatible; UQompress/1.0; UQCS hackathon project)";

type Offering = {
  label: string;
  startDate: Date;
  endDate: Date;
  profileUrl: string | null;
};

export type EcpLookupResult =
  | { outcomes: string; semesterLabel: string; profileUrl: string }
  | { error: string };

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`Request to ${url} failed with ${res.status}`);
  return res.text();
}

function parseOfferings(html: string): Offering[] {
  const $ = cheerio.load(html);
  const offerings: Offering[] = [];

  $("#course-current-offerings tbody tr").each((_, row) => {
    const $row = $(row);
    const label = $row.find(".course-offering-year").text().trim();
    const match = label.match(
      /\((\d{2})\/(\d{2})\/(\d{4})\s*-\s*(\d{2})\/(\d{2})\/(\d{4})\)/,
    );
    if (!match) return;
    const [, sd, sm, sy, ed, em, ey] = match;

    const profileUrl =
      $row.find(".course-offering-profile a.profile-available").attr("href") ?? null;

    offerings.push({
      label,
      startDate: new Date(Number(sy), Number(sm) - 1, Number(sd)),
      endDate: new Date(Number(ey), Number(em) - 1, Number(ed)),
      profileUrl,
    });
  });

  return offerings;
}

// Prefers the offering running right now; otherwise the next upcoming one;
// otherwise the most recently finished one.
function pickCurrentOffering(offerings: Offering[]): Offering | null {
  const withProfile = offerings.filter((o) => o.profileUrl);
  if (withProfile.length === 0) return null;

  const now = new Date();
  const inProgress = withProfile.find((o) => o.startDate <= now && now <= o.endDate);
  if (inProgress) return inProgress;

  const upcoming = withProfile
    .filter((o) => o.startDate > now)
    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  if (upcoming.length > 0) return upcoming[0];

  const past = withProfile
    .filter((o) => o.endDate < now)
    .sort((a, b) => b.endDate.getTime() - a.endDate.getTime());
  return past[0] ?? null;
}

// The profile page nests a <p> inside a <p> around each outcome (invalid
// HTML), so a spec-compliant parser splits it into sibling <p>s: a label
// ("LO1."), the outcome text, then a stray empty <p> from the auto-closed tag.
function parseLearningOutcomes(html: string): string[] {
  const $ = cheerio.load(html);
  const paragraphs = $("#learning-outcomes .learning-outcome-wrapper > p").toArray();

  const outcomes: string[] = [];
  let pendingLabel: string | null = null;

  for (const el of paragraphs) {
    const text = $(el).text().trim();
    if (!text) continue;

    if (/^LO\d+\.?$/i.test(text)) {
      pendingLabel = text;
      continue;
    }

    outcomes.push(pendingLabel ? `${pendingLabel} ${text}` : text);
    pendingLabel = null;
  }

  return outcomes;
}

export async function lookupLearningOutcomes(courseCode: string): Promise<EcpLookupResult> {
  const code = courseCode.trim().toUpperCase();
  if (!code) return { error: "No course code provided." };

  const listUrl = `https://programs-courses.uq.edu.au/course.html?course_code=${encodeURIComponent(code)}`;

  let listHtml: string;
  try {
    listHtml = await fetchHtml(listUrl);
  } catch {
    return { error: "Could not reach the UQ course listing page." };
  }

  const current = pickCurrentOffering(parseOfferings(listHtml));
  if (!current || !current.profileUrl) {
    return { error: `No available course profile found for ${code}.` };
  }

  let profileHtml: string;
  try {
    profileHtml = await fetchHtml(current.profileUrl);
  } catch {
    return { error: "Could not reach the course profile page." };
  }

  const outcomes = parseLearningOutcomes(profileHtml);
  if (outcomes.length === 0) {
    return { error: "Learning outcomes section not found on the course profile." };
  }

  return {
    outcomes: outcomes.join("\n"),
    semesterLabel: current.label,
    profileUrl: current.profileUrl,
  };
}
