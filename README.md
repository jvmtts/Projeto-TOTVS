# Árion

Frontend React e TypeScript conectado à API Java do `Challenges_TOTVS_DDD`.

## Abrir

Na pasta `Projeto-TOTVS`:

```powershell
npm.cmd install
npm.cmd run dev
```

O comando inicia a API Java, aguarda o banco ficar pronto e abre o servidor do frontend. Requer Java 25. Na primeira execução ou após alterações no backend, compila a API com o Maven Wrapper. Abra o endereço mostrado pelo Vite e mantenha o terminal aberto. `Ctrl+C` encerra os processos iniciados por esse comando; uma API que já estava rodando é reutilizada e permanece ativa.

O proxy de desenvolvimento e de preview encaminha `/api` para `http://127.0.0.1:8080`. Para conferir a versão compilada, execute `npm.cmd run build` e `npm.cmd run preview`.

## Funcionamento

- A entrada mostra diretamente as reuniões, com busca por assunto, filtro por participante, filtro por existência de relatório e paginação executados no servidor.
- Clientes permite cadastrar contato, empresa e CNPJ e consultar as reuniões com sua participação.
- Equipe permite cadastrar profissionais, atualizar cargo e perfil e consultar suas reuniões.
- Nova reunião permite selecionar vários participantes, informar assunto e data e colar ou importar uma transcrição UTF-8 de 50 a 50.000 caracteres.
- O detalhe consulta os dados da API, gera relatórios pelo Java, permite editar e excluir reuniões, selecionar versões dos relatórios, pesquisar na transcrição e exportar o registro em `.txt`.
- A geração depende de `GEMINI_API_KEY` configurada no backend. A interface não cria relatórios fictícios como substituição.
- Notas pessoais ficam neste navegador, separadas por API, banco e reunião. Elas não são sincronizadas com outros usuários.
- O estudo acadêmico com vinte textos fictícios aparece apenas em `/estudo`, separado das reuniões reais.

Os registros locais da versão anterior em `arion.workspace.v1` não são apagados nem enviados ao banco automaticamente. Os exemplos antigos não são usados como fallback quando a API está indisponível.

## Configuração

Durante o desenvolvimento, `ARION_API_TARGET` pode alterar o destino do proxy do Vite. O valor padrão é `http://127.0.0.1:8080`.

O inicializador procura `Challenges_TOTVS_DDD` junto ao frontend ou na pasta acima de `Fiap`. Se o backend estiver em outra pasta, defina `ARION_BACKEND_DIR` no arquivo `.env.local`. Para trabalhar apenas no frontend com uma API gerenciada separadamente, use `npm.cmd run dev:front`.

Para um frontend servido sem o proxy do Vite, defina `VITE_API_URL` com a URL completa da API terminada em `/api`, antes do build, e configure a origem do frontend no CORS do backend. Nenhuma chave de IA deve ser colocada nas variáveis `VITE_*`.

## Verificar

```powershell
npm.cmd run typecheck
npm.cmd run build
```

Verificação funcional:

1. Cadastre um cliente e um profissional. Confirme que continuam disponíveis após recarregar.
2. Registre uma reunião com os participantes e importe um `.txt`.
3. Gere um relatório com a chave configurada no backend e consulte a biblioteca.
4. Edite a transcrição. Confirme que o relatório anterior permanece identificado como anterior e que uma nova versão pode ser gerada.
5. Salve notas, recarregue, pesquise um trecho sem acentos e exporte o registro.
6. Consulte a reunião nos históricos dos participantes.
7. Cancele e confirme a exclusão, verificando que os relatórios vinculados também saem da API.
8. Pare a API. A interface deve informar a falha de conexão e não mostrar exemplos como se fossem dados sincronizados.

Login e restrição de acesso ainda não estão implementados. Perfis identificam a função do profissional no cadastro.
