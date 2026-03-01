<BrowserRouter>
  <EnvironmentGuard>
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Index />} />
      <Route path="/login" element={<Login />} />
      <Route path="/instalar" element={<Instalar />} />

      {/* Owner Portal - Isolado */}
      <Route
        path="/owner"
        element={
          <SystemOwnerGuard>
            <Owner />
          </SystemOwnerGuard>
        }
      />

      {/* Protected App Routes */}
      <Route element={<AppLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/solicitacoes" element={<Solicitacoes />} />
        <Route path="/os/nova" element={<NovaOS />} />
        <Route path="/os/fechar" element={<FecharOS />} />
        <Route path="/os/historico" element={<HistoricoOS />} />
        <Route path="/backlog" element={<Backlog />} />
        <Route path="/programacao" element={<Programacao />} />
        <Route path="/preventiva" element={<Preventiva />} />
        <Route path="/preditiva" element={<Preditiva />} />
        <Route path="/inspecoes" element={<Inspecoes />} />
        <Route path="/fmea" element={<FMEA />} />
        <Route path="/rca" element={<RCA />} />
        <Route path="/melhorias" element={<Melhorias />} />
        <Route path="/hierarquia" element={<Hierarquia />} />
        <Route path="/equipamentos" element={<Equipamentos />} />
        <Route path="/mecanicos" element={<Mecanicos />} />
        <Route path="/materiais" element={<Materiais />} />
        <Route path="/fornecedores" element={<Fornecedores />} />
        <Route path="/contratos" element={<Contratos />} />
        <Route path="/documentos" element={<DocumentosTecnicos />} />
        <Route path="/lubrificacao" element={<Lubrificacao />} />
        <Route path="/custos" element={<Custos />} />
        <Route path="/relatorios" element={<Relatorios />} />
        <Route path="/ssma" element={<SSMA />} />
        <Route path="/usuarios" element={<Usuarios />} />
        <Route path="/auditoria" element={<Auditoria />} />
        <Route path="/master-ti" element={<MasterTI />} />
        <Route path="/inteligencia-causa-raiz" element={<RootCauseAIPage />} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  </EnvironmentGuard>
</BrowserRouter>