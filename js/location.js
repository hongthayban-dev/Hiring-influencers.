// ผูก dropdown จังหวัด/อำเภอ/ตำบล กับ THAILAND_LOCATION_DATA (location-data.js)
// และเติมรหัสไปรษณีย์อัตโนมัติ
function initLocationSelects({ provinceEl, districtEl, subdistrictEl, zipcodeEl }) {
  const data = window.THAILAND_LOCATION_DATA || {};

  function fillOptions(select, items, placeholder) {
    select.innerHTML = "";
    const opt0 = document.createElement("option");
    opt0.value = "";
    opt0.textContent = placeholder;
    select.appendChild(opt0);
    items.forEach((item) => {
      const opt = document.createElement("option");
      opt.value = item;
      opt.textContent = item;
      select.appendChild(opt);
    });
    select.disabled = items.length === 0;
  }

  function resetDistrictAndBelow() {
    fillOptions(districtEl, [], "-- เลือกอำเภอ/เขต --");
    fillOptions(subdistrictEl, [], "-- เลือกตำบล/แขวง --");
    zipcodeEl.value = "";
  }

  function resetSubdistrictAndBelow() {
    fillOptions(subdistrictEl, [], "-- เลือกตำบล/แขวง --");
    zipcodeEl.value = "";
  }

  fillOptions(provinceEl, Object.keys(data).sort(), "-- เลือกจังหวัด --");
  resetDistrictAndBelow();

  provinceEl.addEventListener("change", () => {
    resetDistrictAndBelow();
    const province = data[provinceEl.value];
    if (province) {
      fillOptions(districtEl, Object.keys(province).sort(), "-- เลือกอำเภอ/เขต --");
    }
  });

  districtEl.addEventListener("change", () => {
    resetSubdistrictAndBelow();
    const province = data[provinceEl.value];
    const district = province && province[districtEl.value];
    if (district) {
      fillOptions(subdistrictEl, Object.keys(district).sort(), "-- เลือกตำบล/แขวง --");
    }
  });

  subdistrictEl.addEventListener("change", () => {
    const province = data[provinceEl.value];
    const district = province && province[districtEl.value];
    const zip = district && district[subdistrictEl.value];
    zipcodeEl.value = zip || "";
  });

  return {
    setValue(province, district, subdistrict, zip) {
      provinceEl.value = province || "";
      provinceEl.dispatchEvent(new Event("change"));
      if (district) {
        districtEl.value = district;
        districtEl.dispatchEvent(new Event("change"));
      }
      if (subdistrict) {
        subdistrictEl.value = subdistrict;
        subdistrictEl.dispatchEvent(new Event("change"));
      }
      if (zip) zipcodeEl.value = zip;
    },
  };
}
