PRAGMA journal_mode = WAL
# Verification of Schedules and Stores

Generated on: 1/31/2026, 10:42:13 AM

SELECT * FROM stores
SELECT * FROM holidays ORDER BY date ASC
## Store: SAN JULIÁN (ID: 46)
| Date | Day | Shift Type | Time | Employee |
|---|---|---|---|---|
SELECT * FROM employees WHERE store_id = 46.0
[Logic] Calculating shifts for SAN JULIÁN on 2026-01-31
| 2026-01-31 | sábado | holiday_shift | 08:00 - 14:30 | CARMEN |
| 2026-01-31 | sábado | reinforcement | 09:30 - 14:30 | JORGE L |
[Logic] Calculating shifts for SAN JULIÁN on 2026-02-01
| 2026-02-01 | domingo | standard | 08:00 - 14:30 | CARMEN |
| 2026-02-01 | domingo | reinforcement | 09:30 - 14:30 | JORGE L |
[Logic] Calculating shifts for SAN JULIÁN on 2026-02-02
| 2026-02-02 | lunes | standard | 08:00 - 14:30 | CARMEN |
[Logic] Calculating shifts for SAN JULIÁN on 2026-02-03
| 2026-02-03 | martes | standard | 08:00 - 14:30 | CARMEN |
[Logic] Calculating shifts for SAN JULIÁN on 2026-02-04
| 2026-02-04 | miércoles | standard | 08:00 - 14:30 | CARMEN |
[Logic] Calculating shifts for SAN JULIÁN on 2026-02-05
| 2026-02-05 | jueves | standard | 08:00 - 14:30 | CARMEN |
[Logic] Calculating shifts for SAN JULIÁN on 2026-02-06
| 2026-02-06 | viernes | holiday_shift | 08:00 - 14:30 | NATALIA |
| 2026-02-06 | viernes | reinforcement | 09:30 - 14:30 | JORGE L |
[Logic] Calculating shifts for SAN JULIÁN on 2026-02-07
| 2026-02-07 | sábado | standard | 08:00 - 14:30 | NATALIA |
[Logic] Calculating shifts for SAN JULIÁN on 2026-02-08
| 2026-02-08 | domingo | standard | 08:00 - 14:30 | NATALIA |
| 2026-02-08 | domingo | reinforcement | 09:30 - 14:30 | JORGE L |
[Logic] Calculating shifts for SAN JULIÁN on 2026-02-09
| 2026-02-09 | lunes | standard | 08:00 - 14:30 | NATALIA |
[Logic] Calculating shifts for SAN JULIÁN on 2026-02-10
| 2026-02-10 | martes | standard | 08:00 - 14:30 | NATALIA |
[Logic] Calculating shifts for SAN JULIÁN on 2026-02-11
| 2026-02-11 | miércoles | standard | 08:00 - 14:30 | CARMEN |
[Logic] Calculating shifts for SAN JULIÁN on 2026-02-12
| 2026-02-12 | jueves | standard | 08:00 - 14:30 | NATALIA |
[Logic] Calculating shifts for SAN JULIÁN on 2026-02-13
| 2026-02-13 | viernes | standard | 08:00 - 14:30 | NATALIA |


## Store: CASTRALVO (ID: 47)
| Date | Day | Shift Type | Time | Employee |
|---|---|---|---|---|
SELECT * FROM employees WHERE store_id = 47.0
[Logic] Calculating shifts for CASTRALVO on 2026-01-31
| 2026-01-31 | sábado | holiday_shift | 07:00 - 15:00 | MAR |
| 2026-01-31 | sábado | reinforcement | 08:00 - 14:30 | LARA |
[Logic] Calculating shifts for CASTRALVO on 2026-02-01
| 2026-02-01 | domingo | standard | 07:00 - 15:00 | MAR |
| 2026-02-01 | domingo | reinforcement | 08:00 - 14:30 | LARA |
[Logic] Calculating shifts for CASTRALVO on 2026-02-02
| 2026-02-02 | lunes | reinforcement | 07:00 - 13:30 | ESTHER M. |
| 2026-02-02 | lunes | standard | 07:00 - 15:00 | MAR |
[Logic] Calculating shifts for CASTRALVO on 2026-02-03
| 2026-02-03 | martes | reinforcement | 07:00 - 13:30 | ESTHER M. |
| 2026-02-03 | martes | standard | 07:00 - 15:00 | ROSA |
[Logic] Calculating shifts for CASTRALVO on 2026-02-04
| 2026-02-04 | miércoles | reinforcement | 07:00 - 13:30 | ESTHER M. |
| 2026-02-04 | miércoles | standard | 07:00 - 15:00 | MAR |
[Logic] Calculating shifts for CASTRALVO on 2026-02-05
| 2026-02-05 | jueves | reinforcement | 07:00 - 13:30 | ESTHER M. |
| 2026-02-05 | jueves | standard | 07:00 - 15:00 | ROSA |
[Logic] Calculating shifts for CASTRALVO on 2026-02-06
| 2026-02-06 | viernes | holiday_shift | 07:00 - 15:00 | ROSA |
| 2026-02-06 | viernes | reinforcement | 08:00 - 14:30 | ESTHER M. |
[Logic] Calculating shifts for CASTRALVO on 2026-02-07
| 2026-02-07 | sábado | standard | 07:00 - 15:00 | ROSA |
| 2026-02-07 | sábado | reinforcement | 08:00 - 14:30 | ESTHER M. |
[Logic] Calculating shifts for CASTRALVO on 2026-02-08
| 2026-02-08 | domingo | standard | 07:00 - 15:00 | ROSA |
| 2026-02-08 | domingo | reinforcement | 08:00 - 14:30 | ESTHER M. |
[Logic] Calculating shifts for CASTRALVO on 2026-02-09
| 2026-02-09 | lunes | reinforcement | 07:00 - 13:30 | ESTHER M. |
| 2026-02-09 | lunes | standard | 07:00 - 15:00 | MAR |
[Logic] Calculating shifts for CASTRALVO on 2026-02-10
| 2026-02-10 | martes | reinforcement | 07:00 - 13:30 | ESTHER M. |
| 2026-02-10 | martes | standard | 07:00 - 15:00 | ROSA |
[Logic] Calculating shifts for CASTRALVO on 2026-02-11
| 2026-02-11 | miércoles | reinforcement | 07:00 - 13:30 | ESTHER M. |
| 2026-02-11 | miércoles | standard | 07:00 - 15:00 | MAR |
[Logic] Calculating shifts for CASTRALVO on 2026-02-12
| 2026-02-12 | jueves | reinforcement | 07:00 - 13:30 | ESTHER M. |
| 2026-02-12 | jueves | standard | 07:00 - 15:00 | ROSA |
[Logic] Calculating shifts for CASTRALVO on 2026-02-13
| 2026-02-13 | viernes | reinforcement | 07:00 - 13:30 | ESTHER M. |
| 2026-02-13 | viernes | standard | 07:00 - 15:00 | MAR |


## Store: AV. ARAGÓN (ID: 48)
| Date | Day | Shift Type | Time | Employee |
|---|---|---|---|---|
SELECT * FROM employees WHERE store_id = 48.0
[Logic] Calculating shifts for AV. ARAGÓN on 2026-01-31
| 2026-01-31 | sábado | holiday_shift | 08:30 - 14:15 | ESTHER P |
[Logic] Calculating shifts for AV. ARAGÓN on 2026-02-01
| 2026-02-01 | domingo | standard | 08:30 - 14:15 | ESTHER P |
[Logic] Calculating shifts for AV. ARAGÓN on 2026-02-02
| 2026-02-02 | lunes | standard | 08:00 - 14:15 | ESTHER P |
| 2026-02-02 | lunes | reinforcement | 09:00 - 13:00 | M. JOSE |
[Logic] Calculating shifts for AV. ARAGÓN on 2026-02-03
| 2026-02-03 | martes | standard | 08:00 - 14:15 | ESTHER P |
| 2026-02-03 | martes | reinforcement | 09:00 - 13:00 | M. JOSE |
[Logic] Calculating shifts for AV. ARAGÓN on 2026-02-04
| 2026-02-04 | miércoles | standard | 08:00 - 14:15 | NATALIA (San Julián) |
[Logic] Calculating shifts for AV. ARAGÓN on 2026-02-05
| 2026-02-05 | jueves | standard | 08:00 - 14:15 | ESTHER P |
[Logic] Calculating shifts for AV. ARAGÓN on 2026-02-06
| 2026-02-06 | viernes | holiday_shift | 08:30 - 14:15 | M. JOSE |
[Logic] Calculating shifts for AV. ARAGÓN on 2026-02-07
| 2026-02-07 | sábado | standard | 07:30 - 14:15 | M. JOSE |
[Logic] Calculating shifts for AV. ARAGÓN on 2026-02-08
| 2026-02-08 | domingo | standard | 08:30 - 14:15 | M. JOSE |
[Logic] Calculating shifts for AV. ARAGÓN on 2026-02-09
| 2026-02-09 | lunes | standard | 08:00 - 14:15 | ESTHER P |
| 2026-02-09 | lunes | reinforcement | 09:00 - 13:00 | M. JOSE |
[Logic] Calculating shifts for AV. ARAGÓN on 2026-02-10
| 2026-02-10 | martes | standard | 08:00 - 14:15 | ESTHER P |
| 2026-02-10 | martes | reinforcement | 09:00 - 13:00 | M. JOSE |
[Logic] Calculating shifts for AV. ARAGÓN on 2026-02-11
| 2026-02-11 | miércoles | standard | 08:00 - 14:15 | NATALIA (San Julián) |
[Logic] Calculating shifts for AV. ARAGÓN on 2026-02-12
| 2026-02-12 | jueves | standard | 08:00 - 14:15 | ESTHER P |
[Logic] Calculating shifts for AV. ARAGÓN on 2026-02-13
| 2026-02-13 | viernes | standard | 08:00 - 14:15 | ESTHER P |
| 2026-02-13 | viernes | reinforcement | 09:00 - 13:00 | M. JOSE |


## Store: STA. AMALIA (ID: 49)
| Date | Day | Shift Type | Time | Employee |
|---|---|---|---|---|
SELECT * FROM employees WHERE store_id = 49.0
[Logic] Calculating shifts for STA. AMALIA on 2026-01-31
| 2026-01-31 | sábado | holiday_shift | 08:00 - 14:45 | ASUN |
| 2026-01-31 | sábado | reinforcement | 09:15 - 14:15 | IMÁN |
| 2026-01-31 | sábado | reinforcement | 08:00 - 12:00 | BEA |
[Logic] Calculating shifts for STA. AMALIA on 2026-02-01
| 2026-02-01 | domingo | reinforcement | 09:15 - 14:15 | IMÁN |
| 2026-02-01 | domingo | reinforcement | 08:00 - 12:00 | BEA |
[Logic] Calculating shifts for STA. AMALIA on 2026-02-02
| 2026-02-02 | lunes | standard | 07:30 - 14:45 | ASUN |
| 2026-02-02 | lunes | reinforcement | 07:30 - 12:00 | BEA |
[Logic] Calculating shifts for STA. AMALIA on 2026-02-03
| 2026-02-03 | martes | standard | 07:30 - 14:45 | ASUN |
| 2026-02-03 | martes | reinforcement | 07:30 - 12:00 | BEA |
| 2026-02-03 | martes | reinforcement | 09:15 - 13:15 | IMÁN |
[Logic] Calculating shifts for STA. AMALIA on 2026-02-04
| 2026-02-04 | miércoles | standard | 07:30 - 14:45 | ASUN |
| 2026-02-04 | miércoles | reinforcement | 07:30 - 12:00 | BEA |
[Logic] Calculating shifts for STA. AMALIA on 2026-02-05
| 2026-02-05 | jueves | standard | 07:30 - 14:45 | ASUN |
| 2026-02-05 | jueves | reinforcement | 07:30 - 12:00 | BEA |
[Logic] Calculating shifts for STA. AMALIA on 2026-02-06
| 2026-02-06 | viernes | holiday_shift | 08:00 - 14:45 | ASUN |
| 2026-02-06 | viernes | reinforcement | 09:15 - 14:15 | CLARA |
| 2026-02-06 | viernes | reinforcement | 08:00 - 12:00 | BEA |
[Logic] Calculating shifts for STA. AMALIA on 2026-02-07
| 2026-02-07 | sábado | standard | 08:00 - 14:45 | ASUN |
| 2026-02-07 | sábado | reinforcement | 09:15 - 14:15 | CLARA |
| 2026-02-07 | sábado | reinforcement | 08:00 - 12:00 | BEA |
[Logic] Calculating shifts for STA. AMALIA on 2026-02-08
| 2026-02-08 | domingo | reinforcement | 09:15 - 14:15 | CLARA |
| 2026-02-08 | domingo | reinforcement | 08:00 - 12:00 | BEA |
[Logic] Calculating shifts for STA. AMALIA on 2026-02-09
| 2026-02-09 | lunes | standard | 07:30 - 14:45 | ASUN |
| 2026-02-09 | lunes | reinforcement | 07:30 - 12:00 | BEA |
[Logic] Calculating shifts for STA. AMALIA on 2026-02-10
| 2026-02-10 | martes | standard | 07:30 - 14:45 | ASUN |
| 2026-02-10 | martes | reinforcement | 07:30 - 12:00 | BEA |
| 2026-02-10 | martes | reinforcement | 09:15 - 13:15 | IMÁN |
[Logic] Calculating shifts for STA. AMALIA on 2026-02-11
| 2026-02-11 | miércoles | standard | 07:30 - 14:45 | ASUN |
| 2026-02-11 | miércoles | reinforcement | 07:30 - 12:00 | BEA |
[Logic] Calculating shifts for STA. AMALIA on 2026-02-12
| 2026-02-12 | jueves | standard | 07:30 - 14:45 | ASUN |
| 2026-02-12 | jueves | reinforcement | 07:30 - 12:00 | BEA |
[Logic] Calculating shifts for STA. AMALIA on 2026-02-13
| 2026-02-13 | viernes | standard | 07:30 - 14:45 | ASUN |
| 2026-02-13 | viernes | reinforcement | 07:30 - 12:00 | BEA |
| 2026-02-13 | viernes | reinforcement | 09:15 - 13:15 | IMÁN |


## Store: FUENFRESCA (ID: 50)
| Date | Day | Shift Type | Time | Employee |
|---|---|---|---|---|
SELECT * FROM employees WHERE store_id = 50.0
[Logic] Calculating shifts for FUENFRESCA on 2026-01-31
| 2026-01-31 | sábado | holiday_shift | 07:30 - 14:30 | YOLANDA |
| 2026-01-31 | sábado | reinforcement | 09:30 - 14:30 | JUDITH |
[Logic] Calculating shifts for FUENFRESCA on 2026-02-01
| 2026-02-01 | domingo | standard | 07:30 - 14:30 | YOLANDA |
| 2026-02-01 | domingo | reinforcement | 09:30 - 14:30 | JUDITH |
[Logic] Calculating shifts for FUENFRESCA on 2026-02-02
| 2026-02-02 | lunes | standard | 07:30 - 14:30 | MARI |
| 2026-02-02 | lunes | reinforcement | 08:00 - 13:00 | YOLANDA |
[Logic] Calculating shifts for FUENFRESCA on 2026-02-03
| 2026-02-03 | martes | standard | 07:30 - 14:30 | YOLANDA |
[Logic] Calculating shifts for FUENFRESCA on 2026-02-04
| 2026-02-04 | miércoles | standard | 07:30 - 14:30 | MARI |
| 2026-02-04 | miércoles | reinforcement | 08:00 - 13:00 | YOLANDA |
[Logic] Calculating shifts for FUENFRESCA on 2026-02-05
| 2026-02-05 | jueves | standard | 07:30 - 14:30 | YOLANDA |
[Logic] Calculating shifts for FUENFRESCA on 2026-02-06
| 2026-02-06 | viernes | holiday_shift | 07:30 - 14:30 | MARI |
| 2026-02-06 | viernes | reinforcement | 09:30 - 14:30 | PAOLA |
[Logic] Calculating shifts for FUENFRESCA on 2026-02-07
| 2026-02-07 | sábado | standard | 07:30 - 14:30 | MARI |
| 2026-02-07 | sábado | reinforcement | 09:30 - 14:30 | PAOLA |
[Logic] Calculating shifts for FUENFRESCA on 2026-02-08
| 2026-02-08 | domingo | standard | 07:30 - 14:30 | MARI |
| 2026-02-08 | domingo | reinforcement | 09:30 - 14:30 | PAOLA |
[Logic] Calculating shifts for FUENFRESCA on 2026-02-09
| 2026-02-09 | lunes | standard | 07:30 - 14:30 | YOLANDA |
| 2026-02-09 | lunes | reinforcement | 08:00 - 13:00 | MARI |
[Logic] Calculating shifts for FUENFRESCA on 2026-02-10
| 2026-02-10 | martes | standard | 07:30 - 14:30 | MARI |
[Logic] Calculating shifts for FUENFRESCA on 2026-02-11
| 2026-02-11 | miércoles | standard | 07:30 - 14:30 | YOLANDA |
| 2026-02-11 | miércoles | reinforcement | 08:00 - 13:00 | MARI |
[Logic] Calculating shifts for FUENFRESCA on 2026-02-12
| 2026-02-12 | jueves | standard | 07:30 - 14:30 | MARI |
[Logic] Calculating shifts for FUENFRESCA on 2026-02-13
| 2026-02-13 | viernes | standard | 07:30 - 14:30 | YOLANDA |
| 2026-02-13 | viernes | reinforcement | 08:00 - 13:00 | MARI |


## Store: SAN JUAN (ID: 51)
| Date | Day | Shift Type | Time | Employee |
|---|---|---|---|---|
SELECT * FROM employees WHERE store_id = 51.0
[Logic] Calculating shifts for SAN JUAN on 2026-01-31
| 2026-01-31 | sábado | holiday_shift | 09:30 - 14:45 | ÁNGELA |
[Logic] Calculating shifts for SAN JUAN on 2026-02-01
| 2026-02-01 | domingo | standard | 09:30 - 14:45 | ÁNGELA |
[Logic] Calculating shifts for SAN JUAN on 2026-02-02
| 2026-02-02 | lunes | standard | 09:00 - 15:15 | ÁNGELA |
[Logic] Calculating shifts for SAN JUAN on 2026-02-03
| 2026-02-03 | martes | standard | 09:00 - 15:15 | ÁNGELA |
[Logic] Calculating shifts for SAN JUAN on 2026-02-04
| 2026-02-04 | miércoles | standard | 09:00 - 15:15 | ÁNGELA |
| 2026-02-04 | miércoles | reinforcement | 09:30 - 13:30 | ISABEL |
[Logic] Calculating shifts for SAN JUAN on 2026-02-05
| 2026-02-05 | jueves | standard | 09:00 - 15:15 | ÁNGELA |
[Logic] Calculating shifts for SAN JUAN on 2026-02-06
| 2026-02-06 | viernes | holiday_shift | 09:30 - 14:45 | ISABEL |
[Logic] Calculating shifts for SAN JUAN on 2026-02-07
| 2026-02-07 | sábado | standard | 09:00 - 14:45 | ISABEL |
[Logic] Calculating shifts for SAN JUAN on 2026-02-08
| 2026-02-08 | domingo | standard | 09:30 - 14:45 | ISABEL |
[Logic] Calculating shifts for SAN JUAN on 2026-02-09
| 2026-02-09 | lunes | standard | 09:00 - 15:15 | ÁNGELA |
[Logic] Calculating shifts for SAN JUAN on 2026-02-10
| 2026-02-10 | martes | standard | 09:00 - 15:15 | ISABEL |
[Logic] Calculating shifts for SAN JUAN on 2026-02-11
| 2026-02-11 | miércoles | standard | 09:00 - 15:15 | ÁNGELA |
[Logic] Calculating shifts for SAN JUAN on 2026-02-12
| 2026-02-12 | jueves | standard | 09:00 - 15:15 | ISABEL |
[Logic] Calculating shifts for SAN JUAN on 2026-02-13
| 2026-02-13 | viernes | standard | 09:00 - 15:15 | ÁNGELA |
| 2026-02-13 | viernes | reinforcement | 09:30 - 13:30 | ISABEL |


