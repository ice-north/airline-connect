# Airline management database

`airline.db` is a local SQLite database for the game prototype.

## Population model

Population is stored once in `population_markets` (47 prefectures, with Hokkaido split into Sapporo, Asahikawa, Hakodate, and other markets). The total is the 2020 Census population of Japan.

Each market is linked to every airport by `airport_market_access`. The model calculates a straight-line access distance, then classifies it as short (0–100km), medium (100–250km), or long (250km+). Demand is allocated across airports, so the aggregate allocated population equals Japan's population without double-counting.

Airport convenience uses a network tier (hub, major, regional) minus distance friction. This intentionally allows a large airport to be preferred even when it is farther away. For example, the Asahikawa market initially prefers New Chitose because its hub score outweighs the medium-range distance. Increasing Asahikawa Airport's service score later can reverse that preference.

## Tables

- `prefectures`: official census population source data
- `airports`: airport identity, geographic position, and network tier
- `population_markets`: non-overlapping source population markets
- `airport_market_access`: distance class, convenience utility, demand share, and allocated population

Run `node prototype/db/seed-airports.cjs` from the workspace root to generate or refresh the SQLite file.
