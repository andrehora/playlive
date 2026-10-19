def __getattr__(name):
    if name in ('January', 'February'):
        import warnings
        warnings.warn(f"The '{name}' attribute is deprecated, use '{name.upper()}' instead",
                      DeprecationWarning, stacklevel=2)
        if name == 'January':
            return 1
        else:
            return 2

    raise AttributeError(f"module '{__name__}' has no attribute '{name}'")
