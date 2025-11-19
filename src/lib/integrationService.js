import { supabase } from "./supabaseClient";

// Fungsi utama untuk integrasi data manifest ke IWKL
export const updateIwklBulananFromManifest = async (manifestData) => {
  try {
    const { agen, kapal, totalPenumpang, tanggal, iwkl_id } = manifestData;
    
    if (!agen || !kapal || !totalPenumpang || !tanggal) {
      console.error('❌ Data manifest tidak lengkap untuk integrasi');
      return { success: false, error: 'Data tidak lengkap' };
    }

    // Extract bulan dan tahun dari tanggal manifest
    const manifestDate = new Date(tanggal);
    const tahun = manifestDate.getFullYear();
    const bulan = manifestDate.getMonth() + 1; // JavaScript month 0-11
    
    console.log('🔄 Processing manifest integration:', {
      agen, kapal, totalPenumpang, tahun, bulan, iwkl_id
    });

    let targetIwklId = iwkl_id;

    // Jika tidak ada iwkl_id, cari berdasarkan kombinasi agen + kapal
    if (!targetIwklId) {
      const searchResult = await findMatchingIwklRecord(agen, kapal);
      if (!searchResult.success) {
        return searchResult;
      }
      targetIwklId = searchResult.iwklId;
    }

    console.log('✅ Target IWKL ID:', targetIwklId);
    return await updateBulananByIwklId(targetIwklId, tahun, bulan, totalPenumpang);

  } catch (error) {
    console.error('❌ Integration error:', error);
    return { success: false, error: error.message };
  }
};

// Helper function untuk mencari record IWKL yang cocok
const findMatchingIwklRecord = async (agen, kapal) => {
  try {
    console.log('🔍 Searching IWKL record for:', { agen, kapal });
    
    const { data: iwklRecords, error } = await supabase
      .from("iwkl")
      .select("id, nama_perusahaan, nama_kapal")
      .ilike('nama_perusahaan', `%${agen}%`)
      .ilike('nama_kapal', `%${kapal}%`);

    if (error) {
      console.error('❌ Error searching IWKL record:', error);
      return { success: false, error };
    }

    if (!iwklRecords || iwklRecords.length === 0) {
      console.log('⚠️ No matching IWKL record found for:', { agen, kapal });
      return { success: false, error: 'No matching IWKL record found' };
    }

    // Ambil record pertama yang cocok
    const bestMatch = iwklRecords[0];
    console.log('✅ Found IWKL match:', bestMatch);
    
    return { 
      success: true, 
      iwklId: bestMatch.id,
      data: bestMatch 
    };

  } catch (error) {
    console.error('❌ Error in findMatchingIwklRecord:', error);
    return { success: false, error: error.message };
  }
};

// Helper function untuk update data bulanan
const updateBulananByIwklId = async (iwklId, tahun, bulan, nilai) => {
  try {
    console.log(`📊 Updating IWKL ${iwklId}, ${tahun}-${bulan}: ${nilai} penumpang`);

    // Cek apakah data bulanan sudah ada
    const { data: existing, error: selError } = await supabase
      .from("iwkl_bulanan")
      .select("id, nilai")
      .eq("iwkl_id", iwklId)
      .eq("tahun", tahun)
      .eq("bulan", bulan)
      .maybeSingle();

    if (selError && selError.code !== "PGRST116") {
      console.error('❌ Error checking existing data:', selError);
      return { success: false, error: selError };
    }

    let result;
    const numericValue = Number(nilai) || 0;

    if (existing) {
      // Update existing - tambahkan nilai baru ke existing
      const newValue = (existing.nilai || 0) + numericValue;
      const { data, error } = await supabase
        .from("iwkl_bulanan")
        .update({ nilai: newValue })
        .eq("id", existing.id)
        .select();

      result = { data, error };
      console.log(`🔄 Updated existing: ${existing.nilai} + ${nilai} = ${newValue}`);
    } else {
      // Insert baru
      const { data, error } = await supabase
        .from("iwkl_bulanan")
        .insert({
          iwkl_id: iwklId,
          tahun: tahun,
          bulan: bulan,
          nilai: numericValue
        })
        .select();

      result = { data, error };
      console.log(`🆕 Created new bulanan record: ${nilai} penumpang`);
    }

    if (result.error) {
      console.error('❌ Error updating bulanan:', result.error);
      return { success: false, error: result.error };
    }

    console.log('✅ Successfully updated IWKL bulanan:', result.data);
    return { 
      success: true, 
      data: result.data,
      message: `Berhasil update data ${tahun}-${bulan}: ${numericValue} penumpang`
    };

  } catch (error) {
    console.error('❌ Error in updateBulananByIwklId:', error);
    return { success: false, error: error.message };
  }
};

// Fungsi untuk mendapatkan data integrasi status
export const getIntegrationStatus = async () => {
  try {
    const { data, error } = await supabase
      .from("iwkl_bulanan")
      .select("*, iwkl(nama_perusahaan, nama_kapal)")
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error getting integration status:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error in getIntegrationStatus:', error);
    return { success: false, error: error.message };
  }
};