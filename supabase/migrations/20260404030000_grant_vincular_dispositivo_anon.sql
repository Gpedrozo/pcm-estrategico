-- Grant anon access to device binding RPCs
-- The mobile app calls these RPCs without authentication (before device is bound)

GRANT EXECUTE ON FUNCTION public.vincular_dispositivo(UUID, TEXT, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.vincular_dispositivo(UUID, TEXT, TEXT, TEXT) TO authenticated;
