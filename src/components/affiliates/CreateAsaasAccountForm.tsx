/**
 * CreateAsaasAccountForm - ETAPA 2
 * 
 * Formulário para criação de subconta no Asaas
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Loader2 } from 'lucide-react';
import { validateCEP, validateBrazilianPhone, formatCEP, formatBrazilianPhone } from '@/utils/validators';
import { asaasWalletService } from '@/services/asaas-wallet.service';
import { toast } from 'sonner';

interface Affiliate {
  name: string;
  email: string;
  phone: string | null;
  document: string;
}

interface CreateAsaasAccountFormProps {
  affiliate: Affiliate;
  onSuccess: () => void;
  onCancel: () => void;
}

interface FormData {
  name: string;
  email: string;
  cpfCnpj: string;
  mobilePhone: string;
  incomeValue: string;
  address: string;
  addressNumber: string;
  province: string;
  postalCode: string;
}

interface FormErrors {
  [key: string]: string;
}

export function CreateAsaasAccountForm({ affiliate, onSuccess, onCancel }: CreateAsaasAccountFormProps) {
  const [formData, setFormData] = useState<FormData>({
    name: affiliate.name || '',
    email: affiliate.email || '',
    cpfCnpj: affiliate.document || '',
    mobilePhone: affiliate.phone || '',
    incomeValue: '',
    address: '',
    addressNumber: '',
    province: '',
    postalCode: ''
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  function handleChange(field: keyof FormData, value: string) {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Limpar erro do campo ao editar
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  }

  function validateForm(): boolean {
    const newErrors: FormErrors = {};

    // Validar campos obrigatórios
    if (!formData.name.trim()) newErrors.name = 'Nome é obrigatório';
    if (!formData.email.trim()) newErrors.email = 'Email é obrigatório';
    if (!formData.cpfCnpj.trim()) newErrors.cpfCnpj = 'CPF/CNPJ é obrigatório';
    if (!formData.mobilePhone.trim()) newErrors.mobilePhone = 'Telefone é obrigatório';
    if (!formData.incomeValue.trim()) newErrors.incomeValue = 'Renda/Faturamento é obrigatório';
    if (!formData.address.trim()) newErrors.address = 'Endereço é obrigatório';
    if (!formData.addressNumber.trim()) newErrors.addressNumber = 'Número é obrigatório';
    if (!formData.province.trim()) newErrors.province = 'Bairro é obrigatório';
    if (!formData.postalCode.trim()) newErrors.postalCode = 'CEP é obrigatório';

    // Validar formato de email
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }

    // Validar formato de CEP
    if (formData.postalCode && !validateCEP(formData.postalCode)) {
      newErrors.postalCode = 'CEP deve ter 8 dígitos';
    }

    // Validar formato de telefone
    if (formData.mobilePhone && !validateBrazilianPhone(formData.mobilePhone)) {
      newErrors.mobilePhone = 'Telefone inválido';
    }

    // Validar renda/faturamento
    const income = parseFloat(formData.incomeValue);
    if (isNaN(income) || income <= 0) {
      newErrors.incomeValue = 'Valor deve ser positivo';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Erro de validação', {
        description: 'Verifique os campos destacados'
      });
      return;
    }

    try {
      setLoading(true);

      // Criar conta no Asaas
      const result = await asaasWalletService.createAccount({
        name: formData.name,
        email: formData.email,
        cpfCnpj: formData.cpfCnpj.replace(/\D/g, ''),
        mobilePhone: formData.mobilePhone.replace(/\D/g, ''),
        incomeValue: parseFloat(formData.incomeValue),
        address: formData.address,
        addressNumber: formData.addressNumber,
        province: formData.province,
        postalCode: formData.postalCode.replace(/\D/g, '')
      });

      // Configurar wallet automaticamente
      await asaasWalletService.configureWallet(result.walletId);

      toast.success('Conta criada com sucesso!', {
        description: 'Sua wallet foi configurada e você já pode receber comissões.'
      });

      onSuccess();
    } catch (err: any) {
      console.error('Erro ao criar conta:', err);
      const errorMessage = err.message || 'Erro ao criar conta. Tente novamente.';
      
      toast.error('Erro ao criar conta', {
        description: errorMessage
      });

      // Se erro específico de campo, destacar
      if (err.field) {
        setErrors({ [err.field]: errorMessage });
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Preencha os dados para criar sua conta no Asaas. Alguns campos já foram pré-preenchidos com seus dados cadastrados.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Nome */}
        <div className="space-y-2">
          <Label htmlFor="name">
            Nome Completo <span className="text-destructive">*</span>
          </Label>
          <Input
            id="name"
            type="text"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            disabled={loading}
            className={errors.name ? 'border-destructive' : ''}
          />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name}</p>
          )}
        </div>

        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="email">
            Email <span className="text-destructive">*</span>
          </Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
            disabled={loading}
            className={errors.email ? 'border-destructive' : ''}
          />
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email}</p>
          )}
        </div>

        {/* CPF/CNPJ */}
        <div className="space-y-2">
          <Label htmlFor="cpfCnpj">
            CPF/CNPJ <span className="text-destructive">*</span>
          </Label>
          <Input
            id="cpfCnpj"
            type="text"
            value={formData.cpfCnpj}
            onChange={(e) => handleChange('cpfCnpj', e.target.value)}
            disabled={loading}
            className={errors.cpfCnpj ? 'border-destructive' : ''}
          />
          {errors.cpfCnpj && (
            <p className="text-sm text-destructive">{errors.cpfCnpj}</p>
          )}
        </div>

        {/* Telefone */}
        <div className="space-y-2">
          <Label htmlFor="mobilePhone">
            Telefone <span className="text-destructive">*</span>
          </Label>
          <Input
            id="mobilePhone"
            type="tel"
            placeholder="(11) 99999-9999"
            value={formData.mobilePhone}
            onChange={(e) => handleChange('mobilePhone', e.target.value)}
            disabled={loading}
            className={errors.mobilePhone ? 'border-destructive' : ''}
          />
          {errors.mobilePhone && (
            <p className="text-sm text-destructive">{errors.mobilePhone}</p>
          )}
        </div>

        {/* Renda/Faturamento */}
        <div className="space-y-2">
          <Label htmlFor="incomeValue">
            Renda/Faturamento Mensal (R$) <span className="text-destructive">*</span>
          </Label>
          <Input
            id="incomeValue"
            type="number"
            step="0.01"
            min="0"
            placeholder="5000.00"
            value={formData.incomeValue}
            onChange={(e) => handleChange('incomeValue', e.target.value)}
            disabled={loading}
            className={errors.incomeValue ? 'border-destructive' : ''}
          />
          {errors.incomeValue && (
            <p className="text-sm text-destructive">{errors.incomeValue}</p>
          )}
        </div>

        {/* CEP */}
        <div className="space-y-2">
          <Label htmlFor="postalCode">
            CEP <span className="text-destructive">*</span>
          </Label>
          <Input
            id="postalCode"
            type="text"
            placeholder="12345-678"
            value={formData.postalCode}
            onChange={(e) => handleChange('postalCode', e.target.value)}
            disabled={loading}
            className={errors.postalCode ? 'border-destructive' : ''}
          />
          {errors.postalCode && (
            <p className="text-sm text-destructive">{errors.postalCode}</p>
          )}
        </div>

        {/* Endereço */}
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="address">
            Endereço <span className="text-destructive">*</span>
          </Label>
          <Input
            id="address"
            type="text"
            placeholder="Rua Exemplo"
            value={formData.address}
            onChange={(e) => handleChange('address', e.target.value)}
            disabled={loading}
            className={errors.address ? 'border-destructive' : ''}
          />
          {errors.address && (
            <p className="text-sm text-destructive">{errors.address}</p>
          )}
        </div>

        {/* Número */}
        <div className="space-y-2">
          <Label htmlFor="addressNumber">
            Número <span className="text-destructive">*</span>
          </Label>
          <Input
            id="addressNumber"
            type="text"
            placeholder="123"
            value={formData.addressNumber}
            onChange={(e) => handleChange('addressNumber', e.target.value)}
            disabled={loading}
            className={errors.addressNumber ? 'border-destructive' : ''}
          />
          {errors.addressNumber && (
            <p className="text-sm text-destructive">{errors.addressNumber}</p>
          )}
        </div>

        {/* Bairro */}
        <div className="space-y-2">
          <Label htmlFor="province">
            Bairro <span className="text-destructive">*</span>
          </Label>
          <Input
            id="province"
            type="text"
            placeholder="Centro"
            value={formData.province}
            onChange={(e) => handleChange('province', e.target.value)}
            disabled={loading}
            className={errors.province ? 'border-destructive' : ''}
          />
          {errors.province && (
            <p className="text-sm text-destructive">{errors.province}</p>
          )}
        </div>
      </div>

      <div className="flex gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
          className="flex-1"
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={loading}
          className="flex-1"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Criando conta...
            </>
          ) : (
            'Criar Conta e Configurar'
          )}
        </Button>
      </div>
    </form>
  );
}
