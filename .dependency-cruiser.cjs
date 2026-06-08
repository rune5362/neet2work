/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "no-circular",
      severity: "warn",
      comment: "순환 의존성은 구조 이해를 어렵게 하므로 문서 리포트에서 표시한다.",
      from: {},
      to: {
        circular: true
      }
    },
    {
      name: "frontend-does-not-import-backend",
      severity: "warn",
      comment: "frontend는 backend src를 직접 import하지 않는다.",
      from: {
        path: "^apps/frontend/src"
      },
      to: {
        path: "^apps/backend/src"
      }
    },
    {
      name: "backend-does-not-import-frontend",
      severity: "warn",
      comment: "backend는 frontend src를 직접 import하지 않는다.",
      from: {
        path: "^apps/backend/src"
      },
      to: {
        path: "^apps/frontend/src"
      }
    }
  ],
  options: {
    doNotFollow: {
      path: "node_modules"
    },
    exclude: {
      path: [
        "\\.test\\.[tj]sx?$",
        "^apps/backend/src/generated/",
        "^apps/frontend/src/test/"
      ]
    },
    tsPreCompilationDeps: true,
    combinedDependencies: true,
    preserveSymlinks: false,
    reporterOptions: {
      dot: {
        collapsePattern: "node_modules/[^/]+"
      },
      archi: {
        collapsePattern: "^(apps/[^/]+/src/[^/]+).*$"
      }
    }
  }
};
