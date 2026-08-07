-- FAQ answers linked to "a vendor" turned out too narrow — residents
-- want "who handles X kind of thing", not one specific person/company.
-- Add a category link instead (matches the free-text vendor.category /
-- neighborhood.categories values already used elsewhere). vendor_id is
-- left in place for now but the UI no longer sets it.

alter table neighborhood_info_items add column category text;
