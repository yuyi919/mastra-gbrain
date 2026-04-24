# GBrain: Effect 閲嶆瀯閲岀▼纰?(Effect Refactoring Milestone)

## 1. 椤圭洰鎰挎櫙 (Project Vision)
灏?`LibSQLStore` 鍐呴儴瀹炵幇鏇挎崲涓虹粡杩?`effect` (Effect-ts) 閲嶆瀯鐨?`BrainStore` 杩愯鏃躲€傞€氳繃寮曞叆鍑芥暟寮忔帶鍒舵祦鍜屾洿浼橀泤鐨勪緷璧栨敞鍏ユ満鍒讹紝褰诲簳閲嶅鏁版嵁璁块棶灞傜殑绋冲畾鎬т笌鍙祴璇曟€э紝楠岃瘉鏍稿績瀛樺偍鍜屾贩鍚堟绱㈠姛鑳界殑姝ｇ‘鎬э紝骞朵负鏁翠釜绯荤粺鐨勪笅涓€姝?Effect 閲嶆瀯锛堝 Agent 灞傘€佸伐鍏烽摼灞傦級濂犲畾鍧氬疄鐨勮繍琛屾椂鍩虹銆?

## 2. 鏍稿績鐩爣 (Core Objectives)
- **搴曞眰杩愯鏃舵浛鎹?*锛氬钩婊戝湴灏嗙幇鏈夌殑 `LibSQLStore` 鍐呴儴閽堝 SQLite / Drizzle 鐨勭洿鎺ヨ皟鐢紝杩佺Щ鑷虫柊閲嶆瀯鐨?`BrainStore` 杩愯鏃躲€?
- **鍔熻兘绛変环涓庢纭€ч獙璇?*锛氱‘淇濆師鏈夌殑 Markdown 鎽勫叆 (Ingestion)銆佹贩鍚堟悳绱?(Hybrid Search)銆佹爣绛?(Tags)銆佸弻閾?(Backlinks) 绛変笟鍔″姛鑳藉湪搴曞眰鏇挎崲鍚庤〃鐜颁竴鑷达紝100% 閫氳繃鐜版湁娴嬭瘯鐢ㄤ緥銆?
- **閲嶆瀯鏋舵瀯婕旇繘**锛氶€氳繃楠岃瘉璇ュ眰绾х殑 `effect` 鏀归€狅紝涓洪」鐩悗缁娇鐢?Effect-ts 鍏ㄩ潰鏇夸唬鍘熸湁 Promise / Async 娴佺▼鎻愪緵鑼冩湰鍜岃矾寰勩€?

## 3. 褰撳墠鑳屾櫙 (Current Context)
鍦ㄦ棭鏈熺殑閲嶆瀯涓紝绯荤粺宸茬粡寮曞叆浜?`Drizzle ORM` 绉婚櫎浜嗙‖缂栫爜鐨?SQL锛屽苟閫氳繃鎶借薄 `GBrainStore` 绛夋帴鍙ｈВ鑰︿簡涓氬姟閫昏緫涓庡簳灞傚疄鐜般€傚悓鏃讹紝鍩轰簬 `node-llama-cpp` 涓?FTS5 鐨勬贩鍚堟绱㈡灦鏋勫凡缁忕ǔ瀹氥€傜洰鍓嶇殑鐡堕鍦ㄤ簬寮傛鎿嶄綔鐨勭粍鍚堛€侀敊璇鐞嗙殑缁熶竴浠ュ強渚濊禆鐜锛堝鏁版嵁搴撹繛鎺ャ€侀厤缃幆澧冿級鐨勫畨鍏ㄦ敞鍏ワ紝鑰岃繖姝ｆ槸 Effect-ts 鍙戞尌浼樺娍鐨勯鍩熴€?

## 4. 鍏抽敭鎸囨爣 (Success Metrics)
- `bun test` 鍏ㄩ噺娴嬭瘯鐢ㄤ緥锛堝寘鎷?`libsql.test.ts` 鍜屽悇涓繍缁磋剼鏈殑闆嗘垚娴嬭瘯锛夋棤涓€澶辫触锛岃揪鍒?0 鎶ラ敊銆?
- TypeScript 涓ユ牸妯″紡 (`tsc --noEmit`) 0 璀﹀憡锛屼笉寮曞叆鏂扮殑 `any` 绫诲瀷鎴?`@ts-expect-error`銆?
- `LibSQLStore` 瀵瑰鎺ュ彛绛惧悕淇濇寔绋冲畾锛屽閮ㄨ皟鐢ㄦ柟锛堝 `src/tools/`銆乣src/agent/`锛夋劅鐭ヤ笉鍒板簳灞傜殑杩愯鏃跺彉鏇淬€?


## What This Is
This repository is a local-first knowledge base implementation built with Bun + TypeScript + Mastra, with SQLite/LibSQL (FTS5 + vector search) storage and tool-based agent access.

## Core Value
Provide reliable ingestion, indexing, and hybrid retrieval for multilingual notes while keeping architecture boundaries clear and testable.

## Requirements
- Keep store access behind StoreProvider interfaces.
- Preserve Effect v4 constraints and systematic patterns.
- Keep tests isolated to ./tmp/ and release resources via dispose().

