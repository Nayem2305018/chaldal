const REGION_AREAS = {
  "dhaka north": "Uttara, Mirpur, Banani, Gulshan, Badda",
  "dhaka central": "Dhanmondi, Farmgate, Tejgaon, Mohammadpur",
  "dhaka south": "Motijheel, Old Dhaka, Jatrabari, Khilgaon",
  "dhaka east": "Rampura, Bashundhara, Gulshan East",
  "dhaka west": "Mohammadpur West, Pallabi, Shyamoli",
};

export const formatRegionLabel = (regionName) => {
  const name = String(regionName || "").trim();
  if (!name) return "";

  const areas = REGION_AREAS[name.toLowerCase()];
  if (!areas) return name;

  return `${areas} (${name})`;
};

export default formatRegionLabel;
