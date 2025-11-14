# Cold Caller App Specification

This document describes the cold-caller web application from a **human, operational, real‑world perspective**, explaining what the app *is meant to do*, how it *should feel*, and how different users will *experience* it.

## Overview

The platform is designed to support a team of cold callers who reach out to doctors across multiple specialties. It streamlines their day-to-day work by giving them a clear workspace where they can manage leads, make calls, document results, schedule appointments, and follow structured calling scripts. The entire system aims to remove friction, reduce mistakes, and create a consistent calling workflow that can scale.

At the same time, the app provides administrators with complete visibility into caller performance, appointment outcomes, and overall pipeline health, allowing the business to track revenue, quality of calls, and efficiency without manual oversight.

## Core Idea

The app acts as the **central command center** for the cold-calling process. Callers log in, see their assigned leads, research them quickly using built-in shortcuts, make outreach attempts, and schedule appointments. Every action is logged and fed into a larger performance and revenue system so management can make informed decisions.

## User Roles

### 1. Callers

Callers use the app as a daily workspace. Their focus is simple:

* Open a lead
* Research the doctor quickly
* Use the built-in script to make the call
* Record what happened
* Update the status
* Schedule appointments when possible

The platform guides them step-by-step, always showing the most relevant information and avoiding clutter.

### 2. Administrators

Admins oversee everything from one centralized dashboard. They can:

* Upload and distribute leads
* Edit and update calling scripts
* Track caller performance and revenue generated
* Monitor activity across the entire pipeline

The admin view is built around clarity, allowing managers to understand what’s happening in minutes, not hours.

## Lead Flow Experience

Every lead starts as a simple profile containing only a full name and specialty. Once a caller opens the profile, the system encourages them to enrich it by adding contact information and notes. Through quick-access search actions, callers can pull up relevant information instantly. As they try to reach the doctor, the system captures each attempt as part of the lead’s timeline.

Over time, each lead builds a history: attempts made, responses received, notes, ratings, and appointments.

When a caller successfully books a meeting, the system automatically creates the calendar event and updates the lead status so everyone stays informed.

## Caller Experience

The app is meant to feel like a **clean, focused workspace**.

Callers don’t get lost; they always know:

* which leads need attention
* what actions they should take next
* which notes or reminders are important
* what script they should follow

Every call is structured, easy to document, and consistent regardless of who makes it.

## Script Experience

The calling script is embedded directly inside each lead profile. Callers don’t switch windows or search for PDFs — the right script automatically loads based on the doctor’s specialty.

Scripts are written and maintained by admins, so changes happen in one place and instantly appear for everyone.

Each script guides the caller through:

* the opening line
* qualification
* key talking points
* handling objections
* how to request the appointment

This creates consistency across the team.

## Appointment Scheduling Experience

When a caller reaches a doctor who is willing to book a meeting, the scheduling process is effortless. With a single action, the caller opens the booking interface that:

* fills in the doctor’s information
* adds caller notes
* generates a Google Meet link
* sends the event to the correct calendar

The system then marks the lead as “Appointment Booked” and logs the call outcome.

## Call Rating Experience

After each attempt, callers can (optionally) rate different aspects of the interaction such as interest level, appointment likelihood, and call control. These ratings contribute to both personal performance insights and admin-level analytics.

The rating experience should feel quick and low-pressure — something the caller can complete in just a few seconds.

## Tagging and Organization

Tags let callers label leads based on real-world qualities that matter: “High Potential,” “Gatekeeper Issue,” or “Good Fit.” These tags make filtering and organizing easier so callers can stay focused.

## Stats and Performance Tracking

Callers always see their numbers: calls made, leads enriched, appointments booked, and revenue generated from their work.

Admins see the broader picture: which callers perform well, which specialties convert the best, where bottlenecks appear, and how the pipeline progresses.

The data isn’t just for reporting — it helps improve scripts, training, and targeting.

## Admin Control Over Scripts and Workflow

Admins can modify scripts, categories, statuses, and guidance from within the app. This means the calling process can evolve over time without requiring development changes.

Scripts serve as the voice of the company, and admin control ensures that voice stays consistent.

## Overall Experience and Purpose

The purpose of the application is to:

* organize leads
* guide callers with structured workflows
* increase appointment bookings
* make admin oversight effortless
* maintain consistency across team members
* scale the calling operation without chaos

Everything inside the app is designed to reduce friction and increase clarity. It's not about fancy features — it’s about helping callers perform better, faster, and more reliably while giving admins the information they need to drive the business forward.

## Additional Elements

### Multi-Category Call Ratings

Detailed call rating categories:

* Interest Level
* Appointment Likelihood
* Decision Maker Reached
* Call Control
* Objection Handling

### Admin Editing

Admins can:

* Edit scripts by specialty
* Update objection handling
* Modify opening pitches
* Change qualifying questions
* Adjust closing lines

### Lead Details

Leads include:

* Full Name
* Specialty
* Parsed First and Last Name
* Status
* Tags
* Notes
* Call History
* Assigned Caller
* Next Actions
* Data Completeness Score

### Appointment Booking

The system:

* Auto-fills details
* Creates a Meet link
* Books on Google Calendar
* Updates lead status
* Logs booking

### Dashboard Metrics

Metrics for callers and admins:

* Calls Made
* Calls Contacted
* Leads Enriched
* Appointments Booked
* Rating Averages
* Conversion Rates
* Revenue Tracking
* Specialty Breakdown

### Filtering & Tagging

Filters include:

* Specialty
* Tags
* Status
* Data Completeness
* Rating Levels
* Appointment Likelihood
* Caller Assignment
* Comments Present
* Appointment Status
