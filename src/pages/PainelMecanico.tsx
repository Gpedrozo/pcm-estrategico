/**
 * @deprecated Substituído por PortalMecanicoOS em /os/portal-mecanico
 * Rota /painel-mecanico redireciona automaticamente via App.tsx <Navigate>
 * Este arquivo é mantido apenas como safety net para imports diretos.
 */
import { Navigate } from 'react-router-dom';

export default function PainelMecanico() {
  return <Navigate to="/os/portal-mecanico" replace />;
}
