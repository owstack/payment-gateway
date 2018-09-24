kubectl create secret generic payment-gw-x509-keys \
--from-file=payments.owstack.org.accountID \
--from-file=payments.owstack.org.ca.crt \
--from-file=payments.owstack.org.ca.der \
--from-file=payments.owstack.org.crt \
--from-file=payments.owstack.org.csr \
--from-file=payments.owstack.org.der \
--from-file=payments.owstack.org.key \
--from-file=payments.owstack.org.le.key
