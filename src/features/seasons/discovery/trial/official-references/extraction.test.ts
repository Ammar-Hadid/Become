import { expect, it } from "vitest";
import { extractImageUrls, validateOfficialUrl } from "./extraction";

it("extracts lazy originals and srcset assets without collecting placeholders, scripts or HTTP links", () => {
  const html = `<img src="../clear.gif" data-original="img/real.jpg" alt="Levi > character">
  <img data-src="img/second.png" src="clear.gif">
  <img src="http://shingeki.tv/old.jpg" srcset="img/a.jpg 320w, img/b.jpg 960w">
  <script>const fake='<img src="https://shingeki.tv/fake.jpg">'</script>
  <!-- <img src="https://shingeki.tv/comment.jpg"> -->`;
  expect(
    extractImageUrls(html, "https://shingeki.tv/season1/character/"),
  ).toEqual([
    "https://shingeki.tv/season1/character/img/real.jpg",
    "https://shingeki.tv/season1/character/img/second.png",
    "https://shingeki.tv/season1/character/img/a.jpg",
    "https://shingeki.tv/season1/character/img/b.jpg",
  ]);
});
it("binds Bandai filenames to the selected title and rejects invented paths/other years", () => {
  const rows = [
    { stry_sq: 4, make_fr_y: null, thumnail1file_txt: "2985004a.jpg" },
    { stry_sq: 1, make_fr_y: 2011, thumnail1file_txt: "2985001a.jpg" },
    { stry_sq: 2, make_fr_y: 2018, thumnail1file_txt: "2985002a.jpg" },
    { stry_sq: 3, make_fr_y: 2011, thumnail1file_txt: "../secret.jpg" },
  ];
  expect(
    extractImageUrls(
      JSON.stringify(rows),
      "https://www.b-ch.com/json/titles/2985.json",
      "bandai-episodes",
    ),
  ).toEqual([
    "https://image2.b-ch.com/ttl2/2985/2985004a.jpg",
    "https://image2.b-ch.com/ttl2/2985/2985001a.jpg",
  ]);
});
it.each([
  "http://shingeki.tv/a",
  "https://shingeki.tv.attacker.test/a",
  "https://user:pass@shingeki.tv/a",
  "https://127.0.0.1/a",
  "https://shingeki.tv:8443/a",
  "https://evil.test/a",
])("rejects unsafe or unreviewed hosts: %s", (url) =>
  expect(() => validateOfficialUrl(url)).toThrow(),
);
