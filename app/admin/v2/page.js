'use client'

// /admin/v2 is an alias of /admin. Keeping one implementation means links
// (?client=<slug>&request=<id>) behave the same on both.
export { default } from '../page'
