-- Phase 0: extensions and enum types.
-- PostGIS lives in the `extensions` schema (Supabase convention); all geography
-- columns and spatial calls are schema-qualified or resolved via search_path.

create schema if not exists extensions;

create extension if not exists postgis with schema extensions;
create extension if not exists pg_trgm with schema extensions;

-- Chef lifecycle. Nothing renders publicly unless status = 'approved'.
create type public.chef_status as enum (
  'draft', 'pending_review', 'approved', 'rejected', 'suspended', 'delisted'
);

-- How a listing entered the system.
create type public.listing_source as enum ('scraped', 'self_signup', 'claimed');

-- Chef-level kitchen profile.
create type public.dietary_profile as enum ('veg_only', 'non_veg', 'mixed');

-- Item-level marker (chef-level filterable tags live in dietary_tags).
create type public.item_dietary as enum ('veg', 'non_veg', 'egg');

create type public.claim_status as enum ('pending', 'approved', 'rejected');

create type public.event_kind as enum ('wa_click', 'profile_view', 'search', 'claim_started');

create type public.ingest_status as enum ('new', 'needs_review', 'promoted', 'discarded');

create type public.verification_action as enum (
  'approved', 'rejected', 'info_requested', 'suspended', 'delisted',
  'claim_approved', 'claim_rejected', 'edited'
);

create type public.photo_kind as enum ('kitchen', 'food', 'chef');
