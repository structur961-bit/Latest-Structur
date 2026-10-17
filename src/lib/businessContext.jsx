import React, { createContext, useContext, useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const BusinessContext = createContext(null);

export function BusinessProvider({ children }) {
  const [currentBusiness, setCurrentBusiness] = useState(null);
  const [membership, setMembership] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadBusiness = async () => {
    setLoading(true);
    setError('');
    setCurrentBusiness(null);
    setMembership(null);
    try {
      const user = await base44.auth.me();
      const ownedBusinesses = await base44.entities.Business.filter({ owner_user_id: user.id });
      if (ownedBusinesses.length > 0) {
        setCurrentBusiness(ownedBusinesses[0]);
        setMembership({ role: 'business_owner', user_email: user.email });
        return;
      }
      if (user.role === 'admin') {
        setMembership({ role: 'platform_admin' });
        return;
      }
      const memberships = await base44.entities.StaffMembership.filter({ user_id: user.id });
      if (memberships.length) {
        throw new Error('This dashboard currently supports business owners. Staff access has not been enabled.');
      }
    } catch (err) {
      setError(err.message || 'Could not load your business.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBusiness();
  }, []);

  const switchBusiness = async (businessId) => {
    const user = await base44.auth.me();
    const businesses = await base44.entities.Business.filter({ id: businessId, owner_user_id: user.id });
    if (businesses.length > 0) {
      setCurrentBusiness(businesses[0]);
    }
  };

  const isPlatformAdmin = membership?.role === 'platform_admin';
  const isOwner = membership?.role === 'business_owner';
  const isManager = membership?.role === 'manager';
  const isStaff = membership?.role === 'staff';

  return (
    <BusinessContext.Provider value={{
      currentBusiness, setCurrentBusiness, membership, loading, error,
      loadBusiness, switchBusiness, isPlatformAdmin, isOwner, isManager, isStaff,
    }}>
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusiness() {
  return useContext(BusinessContext);
}
