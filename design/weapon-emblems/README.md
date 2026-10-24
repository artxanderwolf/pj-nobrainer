# Weapon emblem mask assets

Source masters for the material-color weapon presentation. Runtime atlases are generated from these masters; no gameplay code uses the source files directly.

## Atlas layout (8 × 64 px = 512 × 64 px)

`silhouette | outline | workingPart | back | gripCore | gripWrap | parry | bowstring`

Unused slot tiles are transparent. `special` is intentionally not represented visually in v1.

## Placeholder mapping

- workingPart: `#C61B3B`
- back: `#1F78D1`
- gripCore: `#2DAA4A`
- gripWrap: `#D1A51A`
- parry: `#C145C1`
- bowstring: `#1DB7C1`
- outline: black / near-black source pixels

## V1 material colors

Runtime material colors are addressed only through the stable `materialId`; display names below are documentation only and must never be used as technical keys.

| materialId | display name | color |
|---:|---|---|
| 1 | Morsche Fichte | `#6A4B31` |
| 2 | Fichte | `#7E5835` |
| 3 | Tanne | `#946038` |
| 4 | Zinn | `#9AA3B0` |
| 5 | Kupfer | `#B66A47` |
| 6 | Aluminium | `#AAB6C2` |
| 7 | Hasen-Leder | `#7D5B43` |
| 8 | Fuchs-Leder | `#9B5A32` |
| 9 | Lederfetzen | `#705340` |

Fallback silhouette color: `#8A8A8A`. Outline color: `#000000`.

A complete non-starter weapon falls back to its fully gray form silhouette when one of its required visible slots is missing, duplicated or uses an unknown material ID. Forge preview mode may instead render unresolved individual slots gray while already selected slots use their material colors. Starter weapons use the gray fallback. `special` never contributes a visible color in v1.

## Validation

All seven source masters are 64×64 RGBA PNGs. All visible pixels were assigned to exactly one expected slot or outline; no visible pixel remained unassigned. Source alpha is retained in the mask alpha channel.

| form | expected visible slots | visible px | source sha256 | atlas sha256 |
|---|---|---:|---|---|
| `dagger` | `workingPart`, `back`, `gripCore`, `gripWrap` | 609 | `1a4c197fd869bd165e124dc6addbfcaadccd051438795b2580f60e9d04378df0` | `2df9581194311b65da5ea625a6f44a07f0dbf9a416319e57d2ff2792992e8e84` |
| `sword` | `workingPart`, `back`, `gripCore`, `gripWrap`, `parry` | 539 | `10d721c2602a03b5071d9e204eb5927d9a30b796d4472f8b4714b6546efa792a` | `33a379ed3f9afc88149f5bc191db54e980b04df3835d92add337809024c111d2` |
| `axe1h` | `workingPart`, `back`, `gripCore`, `gripWrap` | 685 | `5151a199b844515aaf48e54861e81098204281699407943c1b7c6d8b0f68c459` | `d55349262f93ede8a6016d8977d5c1dace6fcbfc4c2f38fbd06a5ec92d0f6021` |
| `sword2h` | `workingPart`, `back`, `gripCore`, `gripWrap`, `parry` | 575 | `a966e68abf700b43ab1bd3136aac2a7f89ad9ae54fc06723050f360709b9da0b` | `f4c53b192ad57ca198039648024f6b111b81464a03a921077dc07123574d7e0e` |
| `axe2h` | `workingPart`, `back`, `gripCore`, `gripWrap` | 598 | `71ccff3ea5d39968299115d090a411b993d8233b0afca983b6db756aa3a00612` | `abce047e58817b4b13e2c8a64556b315f54bd1042fc919ccea4896cb815524a3` |
| `bow` | `back`, `gripCore`, `gripWrap`, `bowstring` | 897 | `305a627f11dde3c4e0a39abc11e9baf47ba2443ae9118e9cea27d47a3266d610` | `5c15c5edf1cc212dc50c6d618e34da2fd467d8a372efc75d94460bcea85d1e4f` |
| `staff` | `back`, `gripCore`, `gripWrap` | 486 | `198b57ac15bd6249b1a9173e6c7506425810e8813f94fcba74ed5935b628fd1f` | `e5d109b4115650e01f5decd5f7d14205661f7407ede4a67af67a92e43ffd0527` |

## Generation rule

Transparent pixels remain transparent. Near-black source pixels are assigned to `outline`; all other visible pixels are classified only among the slots valid for that weapon form by nearest placeholder color direction. Each atlas mask preserves the original pixel alpha. The silhouette tile preserves the complete source alpha.
