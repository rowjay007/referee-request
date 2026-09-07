import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

const useCases = {
  "academic-references": {
    title: "Academic reference requests without the back-and-forth",
    description:
      "Give professors and supervisors the context they need for university, scholarship, fellowship, and PhD applications.",
    points: [
      "Organise your programme, deadline, CV, statement, and relationship context in one packet.",
      "Let your referee review and accept the request without creating an account.",
      "Track progress without repeatedly searching your inbox.",
    ],
  },
  "job-references": {
    title: "Professional references, clearly coordinated",
    description:
      "Make it easy for a manager, colleague, or mentor to provide a strong reference for your next role.",
    points: [
      "Share the role, organisation, application link, deadline, and achievements together.",
      "Give your referee clear prompts without writing the reference for them.",
      "Know when the request is opened, accepted, in progress, or submitted.",
    ],
  },
  scholarships: {
    title: "Scholarship references with less chasing",
    description:
      "Prepare a complete, thoughtful reference request for scholarships, grants, and fellowships.",
    points: [
      "Explain why you are applying and what your referee should highlight.",
      "Keep supporting documents and submission instructions in one secure place.",
      "Stay ahead of deadlines with reminders and clear next actions.",
    ],
  },
} as const;

type Slug = keyof typeof useCases;

type PageProps = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return Object.keys(useCases).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = useCases[slug as Slug];
  return {
    title: page?.title ?? "Reference requests",
    description: page?.description,
  };
}

export default async function UseCasePage({ params }: PageProps) {
  const { slug } = await params;
  const page = useCases[slug as Slug] ?? useCases["academic-references"];

  return (
    <main className="min-h-full bg-[#f2eee4] px-6 py-12 text-[#172126] sm:px-10 lg:py-20">
      <div className="mx-auto max-w-4xl">
        <Link href="/" className="text-sm font-medium text-[#53635e] underline-offset-4 hover:underline">
          RefereeRequest
        </Link>
        <section className="mt-16 max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#b45f3d]">Reference coordination</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-6xl">{page.title}</h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-[#53635e]">{page.description}</p>
          <Link
            href="/signup"
            className="mt-8 inline-flex items-center gap-2 rounded-md bg-[#172126] px-5 py-3 text-sm font-semibold text-white"
          >
            Request a reference <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
        <section className="mt-20 border-t border-[#d8d1c6] pt-8">
          <h2 className="text-2xl font-semibold">Give your referee everything they need.</h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-3">
            {page.points.map((point) => (
              <li key={point} className="border-l-2 border-[#b45f3d] pl-4 text-sm leading-6 text-[#53635e]">
                <Check className="mb-2 h-4 w-4 text-[#b45f3d]" />
                {point}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
