"""Generates app/content/curriculum.json from the approved curriculum map (PRD v1.0).

Lesson codes: C concept, B build, S simulation, K critique, P portfolio, A assessment, R buffer.
Rubrics are AI-drafted and must be reviewed by the content owner.
"""
import json
from pathlib import Path

RUBRICS = {
    "B": ["Delivers the specific artifact named in the lesson title",
          "Uses concrete, realistic detail instead of generic statements",
          "Defines owners, dates or measures where relevant",
          "Identifies key risks or assumptions",
          "Is clear enough for a sponsor to act on"],
    "S": ["States the decision or position clearly",
          "Gives reasoning with business and delivery impact",
          "Anticipates the stakeholder's likely objections",
          "Proposes concrete next actions with owners",
          "Keeps a professional tone under pressure"],
    "K": ["Identifies root causes, not only symptoms",
          "Maps causes to specific project management practices",
          "Separates facts from assumptions",
          "Lists specific preventive actions",
          "Applies the lessons to the learner's own capstone"],
    "P": ["Consolidates earlier work into one coherent artifact",
          "Stays consistent with the chosen capstone initiative",
          "Is complete and presentable to an executive",
          "Shows measurable outcomes and stated assumptions",
          "Avoids unexplained jargon"],
    "A": ["Covers the key competencies of the level",
          "Applies the concepts to the capstone with evidence",
          "Uses terminology accurately",
          "Is realistic and actionable",
          "Prioritises correctly"],
}

LEVELS = [
    (1, "IT Delivery Foundations", [
        ("The IT project landscape", "C Day 1 as an enterprise IT PM · C IT project types (app, infra, data, security, AI) · C Predictive, agile and hybrid lifecycles · C Technical literacy for IT PMs (SDLC, environments, APIs, cloud basics) · B Write a project charter for a website migration · K Healthcare.gov launch (2013) · P Pick your capstone IT initiative"),
        ("Initiation and stakeholders", "C Stakeholders in IT orgs (CIO, CISO, ops, vendors) · C Business case and ROI basics · C BRD vs FRD vs user stories · B Stakeholder register + RACI · S Kickoff with a sceptical sponsor · K TSB bank IT migration (2018) · P Charter v2 + RACI"),
        ("Planning", "C Scope and WBS · C Estimation (analogous, three-point, story points) · C Scheduling and critical path · B WBS + schedule in Jira, Azure DevOps or Gantt · C Budget and cost baseline · S Sponsor cuts budget by 20% · P Integrated plan"),
        ("Risk, quality and communication", "C Risk management and the RAID log · C Quality planning and acceptance criteria · C Communication plan and RAG status reporting · B RAID log for your capstone · C Change control and CAB · S Steering committee review of a red project · P RAID + status report"),
    ], "Buffer: catch-up", "Level 1 assessment + certificate"),
    (2, "Agile and Hybrid Delivery", [
        ("Scrum for IT PMs", "C Scrum framework and roles · C Backlog, user stories, INVEST, acceptance criteria · C Sprint planning and estimation · B Build a 20-story backlog in Jira or Azure DevOps · C Ceremonies that work · S Product Owner vs dev team conflict · P Sprint 1 plan"),
        ("Flow, metrics and hybrid", "C Velocity, burndown, cumulative flow · C Kanban, WIP limits, cycle time · B Configure a Jira / Azure DevOps delivery dashboard · C Agile delivery inside waterfall governance · S Executive demands fixed date and fixed scope · K An agile transformation that failed (anonymised) · P Hybrid delivery model"),
        ("Scale and vendors", "C SAFe essentials (ART, PI planning) · C Cross-team dependencies · C Vendor contracts (T&M vs fixed price, SLAs) · B PI planning board + dependency map · C Onsite / offshore delivery models · S Vendor misses an SLA: escalation call · P Vendor governance pack"),
        ("Leading people", "C Leading without authority · C Conflict and negotiation · C Distributed teams · B Team charter + working agreements · C Escalation paths · S Key engineer resigns mid-release · P Escalation playbook"),
    ], "Buffer", "Level 2 assessment + certificate"),
    (3, "Cloud, DevSecOps and Service Delivery", [
        ("Cloud projects", "C Cloud models and shared responsibility · C Migration strategies (the 7 Rs) · C Landing zones and Well-Architected · C FinOps for PMs · B Migration plan for a 3-tier app · K A major cloud or vendor outage (e.g. CrowdStrike, July 2024) · P Migration plan + cost estimate"),
        ("DevOps and release", "C DevOps principles and DORA metrics · C CI/CD pipeline anatomy · C Release strategies (blue/green, canary, feature flags) · B Release plan + pipeline walkthrough in Azure DevOps · C Docker, Kubernetes and IaC for PMs · S Failed production deployment: rollback decision · P Release and cutover plan"),
        ("Security by design", "C Shift-left DevSecOps (SAST, DAST, SCA, secrets) · C Zero trust basics · C Compliance (ISO 27001, SOC 2, India DPDP Act 2023, GDPR) · B Threat model (STRIDE) + security requirements · C Vulnerability management and pen-test coordination · S Critical CVE found 2 days before go-live · P Security plan"),
        ("Service transition (ITIL 4)", "C ITIL 4 service value system · C Transition and hypercare · C Incident, problem and change · B Go-live runbook + hypercare plan · C SLAs, SLOs and observability · S P1 incident bridge call · P Runbook + SLO sheet"),
    ], "Buffer", "Level 3 assessment + certificate"),
    (4, "AI-enabled IT Programs", [
        ("AI project fundamentals", "C How AI projects differ (probabilistic, data-dependent) · C AI solution types (ML, GenAI, RAG, agents) · C Use-case discovery and feasibility scoring · B AI use-case canvas + business case · C Data readiness assessment · K Air Canada chatbot tribunal ruling (2024) · P AI business case"),
        ("Delivering AI", "C AI delivery lifecycle (MLOps / LLMOps) · C Prompting and evals for PMs · B 20-row eval set run against the OpenAI API · C Token economics, cost and latency · B AI cost model · S Model hits 80% against a 95% target; sponsor wants launch · P Eval suite + cost model"),
        ("AI governance and security", "C NIST AI RMF · C ISO/IEC 42001 · C EU AI Act risk tiers · C LLM security (prompt injection, data leakage) · B AI risk register + model card · S Legal and CISO block the launch · P AI governance pack"),
        ("Program leadership + capstone", "C AI roadmaps and portfolio management · C Change management and adoption (ADKAR) · C Monitoring, drift, human-in-the-loop · B Capstone program plan · S Mock interview: AI-enabled program scenario (AI-graded) · B Capstone presentation · P Capstone deck"),
    ], "Buffer + portfolio polish", "Capstone submission + final certificate"),
]


def build() -> dict:
    out, day, phase_no = {"levels": []}, 0, 0
    for lid, title, phases, buffer_title, assess_title in LEVELS:
        days = []
        for phase_title, lessons in phases:
            phase_no += 1
            items = [s.strip() for s in lessons.split(" · ")]
            assert len(items) == 7, (phase_title, len(items))
            for item in items:
                day += 1
                kind, name = item[0], item[2:]
                entry = {"day": day, "type": kind, "title": name, "phase": f"{phase_no}. {phase_title}"}
                if kind in RUBRICS:
                    entry["rubric"] = RUBRICS[kind]
                days.append(entry)
        day += 1
        days.append({"day": day, "type": "R", "title": buffer_title, "phase": "Close"})
        day += 1
        days.append({"day": day, "type": "A", "title": assess_title, "phase": "Close", "rubric": RUBRICS["A"]})
        out["levels"].append({"id": lid, "title": title, "days": days})
    assert day == 120
    return out


if __name__ == "__main__":
    target = Path(__file__).resolve().parent.parent / "app" / "content" / "curriculum.json"
    target.write_text(json.dumps(build(), indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    print("wrote", target)
