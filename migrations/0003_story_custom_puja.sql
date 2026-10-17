-- Stories for pujas that aren't listed on the site: the visitor types the name and location.
-- For these, stories.pandal = 'other'.
ALTER TABLE stories ADD COLUMN puja_name TEXT;
ALTER TABLE stories ADD COLUMN puja_area TEXT;
