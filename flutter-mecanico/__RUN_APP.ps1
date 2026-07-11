# ==========================================
# Script para executar o flutter_mecanico
# Execute UM comando por vez:
# ==========================================

# PASSO 1: Ir para a pasta do projeto
cd "C:\Users\Gustavo Pedrozo Pint\pcm-estrategico-clone\flutter-mecanico"

# PASSO 2: Remover lock antigo (força resolução limpa)
Remove-Item pubspec.lock -Force -ErrorAction SilentlyContinue

# PASSO 3: Remover cache de hooks (evita o erro objective_c)
Remove-Item .dart_tool -Recurse -Force -ErrorAction SilentlyContinue

# PASSO 4: Baixar dependências
flutter pub get

# PASSO 5: Rodar no Chrome
flutter run -d chrome
</｜｜DSML｜｜parameter>
</write_to_file>