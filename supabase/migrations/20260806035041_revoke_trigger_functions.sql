-- Las funciones de trigger dejan de ser invocables por HTTP.
--
-- PostgREST publica en /rest/v1/rpc/ toda funcion que el rol pueda ejecutar, y al
-- crear una funcion PUBLIC recibe EXECUTE por defecto. La tanda 1 se lo revoco a
-- las cinco RPC de verdad y nunca a las de trigger, asi que las seis quedaron
-- expuestas. Los advisors del remoto lo detectaron al empujar la Fase 1.
--
-- No es explotable hoy: plpgsql responde "trigger functions can only be called as
-- triggers". Pero esa proteccion la da el intérprete, no el diseño, y desaparece
-- si alguna deja de ser de trigger.
--
-- Se revocan las SEIS, no solo las tres SECURITY DEFINER que marca el linter. Las
-- otras tres estan igual de publicadas; lo unico que cambia es que correrian con
-- los privilegios de quien llama, y por eso el linter no las cuenta como escalada.
-- Arreglar la mitad obligaria a que 19_function_hardening.sql llevara excepciones,
-- y una prueba de cobertura con excepciones deja de cubrir.
--
-- MEDIDO el 2026-08-05, y era la pregunta abierta de este arreglo: un trigger NO
-- necesita EXECUTE sobre su funcion. Tras revocarlo, las 124 aserciones pasan,
-- incluidas 21_no_overlap, 22_state_machine y 25_penalties, que son las que
-- caerian en el acto si los triggers dejaran de dispararse.
--
-- No se daba por supuesto porque la tanda 0 midio lo contrario para las politicas:
-- revocar EXECUTE a un helper SECURITY DEFINER ROMPE la politica que lo usa, con
-- "permission denied for function".
--
-- La asimetria: a un trigger lo invoca el MOTOR, y el privilegio se comprueba en
-- la llamada. La expresion de una politica, en cambio, se evalua como el usuario
-- que consulta, asi que necesita poder ejecutar lo que invoca.
--
-- Las cinco RPC de verdad no se tocan: que `authenticated` pueda ejecutarlas es
-- el diseño entero de la Fase 1, y cada una comprueba la autorizacion por dentro.
--
-- Ver MIGRATION_DOCS/PLANES/FIX_FUNCIONES_TRIGGER.md.

revoke execute on function public.apply_penalties()                from public, anon, authenticated;
revoke execute on function public.handle_new_auth_user()           from public, anon, authenticated;
revoke execute on function public.log_reservation_status()         from public, anon, authenticated;
revoke execute on function public.enforce_reservation_transition() from public, anon, authenticated;
revoke execute on function public.fn_update_updated_at()           from public, anon, authenticated;
revoke execute on function public.set_blocked_range()              from public, anon, authenticated;
