## Calhacks 12.0 Regeneron Track Runner Up
## Inspiration
The regulatory pathway for clinical trials is no joke. For example, wordy filings such as FDA Form 1571, FDA Form 1572 and FDA Form 3674 are required for an Investigational New Drug application, on top of dozens of others.
With so many forms, protocols and standardizations piling up, clinicians spend far too much time on paperwork and far too little time on what really matters: advancing healthcare. We live in a fast world. Nobody has time for that. We believe nobody **should** be stuck in data-cleanup purgatory.

## What it does
Enter **Trialytics**: a purpose-built solution to take the mountain of raw trial data and transform it into a **fully protocol-compliant workflow**.  
Our system:
- Accepts just **three core data documents** from a clinician (clinical trial protocol, raw data, SAP)  
- Condenses their workflow by **tens to hundreds of documents** and **countless hours** 
- Ensures compliance with regulatory requirements. It's the difference between approval and starting over completely.

## How we built it
We didn’t just wrap a generic GPT model and call it a day. Our team is comprised of scientists with deep regulatory and clinical trial domain expertise. We built everything from the ground up.  
**Tech stack includes:**

Frontend
- NextJS
- Tailwind
- ShadCN
- ChartJS

Backend
- Fast API
- VLLM
- tRPC
- Supabase
- S3
- Modal
 
We implemented:  
- Automated ingestion of freely-formatted clinician data  
- Mapping to standard formats (e.g., SDTM, ADAM, ICH-E3)  
- Rule-based compliance checks (for forms like 1571/1572/3674 and CSRs)  
- A user interface built for fast turnaround and minimal training.

## Challenges we ran into
Maintaining regulatory precision at scale was our biggest hurdle. Compliance isn’t just conceptually important. It’s **mandatory** when human lives are at stake.  Adapting freeform clinician data into structured, regulatory-ready formats required solving edge cases, format variability, and mapping ambiguity, all while making the tool friendly and usable was our largest hurdle.

## Accomplishments that we're proud of
- **End-to-end working prototype** from protocol upload → SDTM → ADaM → AI analysis
- **Real streaming responses** that feel as responsive as ChatGPT
- **CDISC-compliant pipeline** using industry-standard pharmaverse R packages
- **Self-hosted LLM** on AWS GPU infrastructure (no API dependencies)
- **Type-safe architecture** across the entire stack
- **Integrated complex technologies** (Next.js + tRPC + Python + R + vLLM) in 36 hours
- **Production-ready infrastructure** with CloudFormation automation

## What we learned
We learned that **rules matter**, not just for safety or approval, but for enabling innovation by removing friction. Regulatory compliance is hard to master, but when done right, it becomes a **feature**, not a blocker.  
We also discovered that treating data formats, protocol mapping, and submission compliance as engineering problems (not just administrative burdens) unlocked major operational improvements.

## What's next for Trialytics
We’re planning to broaden **Trialytics**’ capabilities:  
- Expand data-cleaning modules (handling more formats, more document types)  
- Build the LLM-to-SDTM conversion as a **packaged integration** (rather than ad-hoc LLM calls) for predictability and auditability  
- Add advanced compliance analytics (real-time monitoring of submission integrity)  
- Extend into new regulatory domains (e.g., device trials, global submissions)  
