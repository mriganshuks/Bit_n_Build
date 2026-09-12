export type Candidate = {
  id: string;
  name: string;
  role: string;
  skills: Array<{ name: string; status: "verified" | "partially_verified" }>;
  matchScore: number;
  why: string;
  evidence: string;
  projects: string[];
  challengeSkill: string;
};

const candidates: Candidate[] = [
  {
    id: "aman-sharma",
    name: "Aman Sharma",
    role: "AI / ML Developer",
    skills: [
      { name: "Python", status: "verified" },
      { name: "Machine Learning", status: "verified" },
      { name: "TensorFlow", status: "verified" },
    ],
    matchScore: 94,
    why: "Your team needs AI / ML and Aman has verified AI / ML skills.",
    evidence: "Model evaluation project · Technical assessment",
    projects: ["CropSense", "Campus Recommendation Engine"],
    challengeSkill: "AI / ML",
  },
  {
    id: "rohit-kumar",
    name: "Rohit Kumar",
    role: "Backend Developer",
    skills: [
      { name: "Node.js", status: "verified" },
      { name: "MongoDB", status: "verified" },
      { name: "Express", status: "partially_verified" },
    ],
    matchScore: 89,
    why: "Your team needs backend expertise and Rohit has strong API experience.",
    evidence: "Backend service project · API integration evidence",
    projects: ["Transit API", "EventFlow"],
    challengeSkill: "Backend",
  },
  {
    id: "simran-kaur",
    name: "Simran Kaur",
    role: "UI/UX Designer",
    skills: [
      { name: "Figma", status: "verified" },
      { name: "UI/UX", status: "verified" },
      { name: "Design systems", status: "partially_verified" },
    ],
    matchScore: 84,
    why: "Your team needs UI/UX expertise for a clear and usable product.",
    evidence: "Design system case study · Portfolio evidence",
    projects: ["Sahaayata", "Student Services Redesign"],
    challengeSkill: "UI/UX",
  },
];

const teamState = {
  name: "BuildX",
  hackathon: "Innovate India 2026",
  requiredSkills: ["AI / ML", "Backend", "UI/UX"],
  members: [
    { name: "Rajveer Singh", role: "Frontend + DSA", status: "Accepted" },
    { name: "Rohit Kumar", role: "Backend", status: "Accepted" },
    { name: "Simran Kaur", role: "UI/UX", status: "Accepted" },
  ],
  pending: ["aman-sharma"],
};

export function getCandidates() {
  return candidates.map((candidate) => ({
    ...candidate,
    skills: candidate.skills.map((skill) => ({ ...skill })),
    projects: [...candidate.projects],
  }));
}

export function getCandidate(id: string) {
  return candidates.find((candidate) => candidate.id === id) ?? null;
}

export function getTeamState(amanAccepted = false) {
  const members = teamState.members.map((member) => ({ ...member }));
  const pending = [...teamState.pending];

  if (amanAccepted && !members.some((member) => member.name === "Aman Sharma")) {
    members.push({ name: "Aman Sharma", role: "AI / ML", status: "Accepted" });
    return {
      ...teamState,
      requiredSkills: [...teamState.requiredSkills],
      members,
      pending: pending.filter((candidateId) => candidateId !== "aman-sharma"),
    };
  }

  return {
    ...teamState,
    requiredSkills: [...teamState.requiredSkills],
    members,
    pending,
  };
}

export function acceptCandidate(id: string) {
  const candidate = getCandidate(id);

  if (!candidate) {
    throw new Error("Candidate not found.");
  }

  if (teamState.members.some((member) => member.name === candidate.name)) {
    return getTeamState();
  }

  teamState.members.push({
    name: candidate.name,
    role: candidate.challengeSkill,
    status: "Accepted",
  });
  teamState.pending = teamState.pending.filter((candidateId) => candidateId !== id);

  return getTeamState();
}
