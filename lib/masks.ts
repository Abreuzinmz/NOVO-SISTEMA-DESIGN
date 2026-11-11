// Máscaras de CPF/CNPJ e telefone usadas nos cadastros de cliente

export const maskCPFCNPJ = (v: string) => {
  v = v.replace(/\D/g, "");
  if (v.length <= 11) {
    return v.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  } else {
    return v.replace(/^(\d{2})(\d)/, "$1.$2").replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d)/, ".$1/$2").replace(/(\d{4})(\d)/, "$1-$2");
  }
};

export const maskPhone = (v: string) => {
  v = v.replace(/\D/g, "");
  if (v.length <= 10) {
    return v.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2");
  } else {
    return v.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
  }
};

/** Só os números do CPF/CNPJ (até 14) */
export const cleanNumeric = (v: string) => v.replace(/\D/g, "").slice(0, 14);
/** Só os números do telefone (até 11) */
export const cleanPhone = (v: string) => v.replace(/\D/g, "").slice(0, 11);
