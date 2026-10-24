# Architecture rules

- Calculate ACA gross premium, subsidy, and net premium through one shared projection helper so withdrawal solving and displayed projection rows remain identical.
- Keep drawdown roadmap grouping in a pure presentation helper using completed projection rows; never infer funding phases from ages alone or change the withdrawal engine to generate summaries.