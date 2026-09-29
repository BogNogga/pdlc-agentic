# Backend package for Signal-to-Opportunity Analysis system

# Verify TLS against the OS trust store instead of certifi's bundle, so HTTPS calls to
# OpenRouter also work behind antivirus or proxy software that inspects TLS traffic.
import truststore

truststore.inject_into_ssl()
